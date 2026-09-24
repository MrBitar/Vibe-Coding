"""Milestones 11 & 13: terminal menu, and a single-shot `python main.py <url>`
mode that runs the full pipeline then walks through approve/reject and a
final upload prompt without going through the interactive menu."""

import json
import sys
from pathlib import Path

from audio_extractor import extract_audio
from captions import add_captions
from cleanup import cleanup_audio, cleanup_clip_intermediates
from clip_finder import find_clips
from clipper import cut_clips
from config import load_config
from downloader import download
from metadata import generate_metadata
from quality_control import run_quality_control
from scheduler import run_due_uploads, schedule_clip
from silence_removal import total_kept_duration
from thumbnail import generate_thumbnails
from transcriber import transcribe
from utils import OUTPUT_DIR, WORK_DIR, write_json_atomic
from vertical import convert_to_vertical
from youtube_uploader import get_authenticated_service, load_upload_history, upload_clip


def _run_stage(stage_num: int, total: int, label: str, fn, *args):
    """Run one pipeline stage, turning any failure into a clear message
    that names the stage instead of a raw traceback - and since every stage
    function is itself idempotent (skips work whose output already exists),
    simply re-running the same command resumes from here instead of
    restarting the whole pipeline."""
    print(f"[{stage_num}/{total}] {label}...")
    try:
        return fn(*args)
    except Exception as e:
        raise RuntimeError(
            f"Pipeline failed at stage {stage_num}/{total} ({label}): {e}\n"
            "Run the same command again to resume - completed stages are skipped automatically."
        ) from e


def process_url(url: str) -> str:
    """Run the full pipeline on a URL: download through metadata generation.
    Every stage is idempotent (skips already-completed work), so if this
    raises partway through, running it again on the same URL resumes rather
    than restarting from scratch."""
    total = 10
    source_meta = _run_stage(1, total, "Downloading", download, url)
    video_id = source_meta["video_id"]
    print(f"      -> {source_meta['title']} ({source_meta['duration']}s)")

    _run_stage(2, total, "Extracting audio", extract_audio, video_id)

    transcript = _run_stage(3, total, "Transcribing (this can take a while)", transcribe, video_id)
    print(f"      -> {len(transcript)} segment(s)")
    cleanup_audio(video_id)

    candidates = _run_stage(4, total, "Finding clips", find_clips, video_id)
    print(f"      -> {len(candidates)} candidate(s)")
    if not candidates:
        print("No candidate clips found for this video (too short, or no clip fits the configured length). Stopping here.")
        return video_id

    _run_stage(5, total, "Cutting clips", cut_clips, video_id)
    _run_stage(6, total, "Converting to vertical", convert_to_vertical, video_id)
    _run_stage(7, total, "Adding captions", add_captions, video_id)
    cleanup_clip_intermediates(video_id)

    report = _run_stage(8, total, "Running quality control", run_quality_control, video_id)
    print(f"      -> {report['passed_count']} passed, {report['failed_count']} failed")

    _run_stage(9, total, "Generating thumbnails", generate_thumbnails, video_id)

    _run_stage(10, total, "Generating metadata", generate_metadata, video_id)

    print(f"\nREADY: video_id={video_id}")
    return video_id


def list_processed_videos() -> list:
    if not WORK_DIR.exists():
        return []
    return sorted(d.name for d in WORK_DIR.iterdir() if (d / "candidates.json").exists())


def _load_json(path, default):
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def _approval_path(video_id: str):
    return WORK_DIR / video_id / "approval.json"


def load_approval(video_id: str) -> dict:
    return _load_json(_approval_path(video_id), {})


def set_approval(video_id: str, index: str, status: str) -> None:
    data = load_approval(video_id)
    data[index] = status
    write_json_atomic(_approval_path(video_id), data, indent=2)


def view_clips(video_id: str) -> None:
    video_dir = WORK_DIR / video_id
    candidates = _load_json(video_dir / "candidates.json", [])
    clip_metadata = _load_json(video_dir / "clip_metadata.json", [])
    report = _load_json(OUTPUT_DIR / video_id / "report.json", {})
    approval = load_approval(video_id)

    if not candidates:
        print(f"No candidates found for {video_id}.")
        return

    qc_by_index = {c["index"]: c for c in report.get("clips", [])}
    meta_by_index = {m["index"]: m for m in clip_metadata}

    print(f"\nClips for {video_id}:")
    for i, c in enumerate(candidates, start=1):
        index = f"{i:02d}"
        title = meta_by_index.get(index, {}).get("title", "(no metadata yet)")
        qc = qc_by_index.get(index)
        qc_status = "PASS" if qc and qc["passed"] else ("FAIL" if qc else "not checked")
        status = approval.get(index, "pending")
        kept_ranges = c.get("kept_ranges") or [[c["start"], c["end"]]]
        duration = round(total_kept_duration(kept_ranges), 1)
        print(f"  [{index}] {status:9s} qc={qc_status:11s} {duration:>5}s  {title}")


def upload_approved_clips(video_id: str) -> None:
    approval = load_approval(video_id)
    approved = sorted(index for index, status in approval.items() if status == "approved")
    if not approved:
        print("No approved clips for this video yet. Approve clips first (menu option 3).")
        return

    history = load_upload_history(video_id)
    to_upload = [i for i in approved if i not in history]
    already_uploaded = [i for i in approved if i in history]
    if already_uploaded:
        print(f"Already uploaded (skipping): {', '.join(already_uploaded)}")
    if not to_upload:
        print("Nothing new to upload.")
        return

    privacy_status = load_config().get("youtube", {}).get("privacy", "private")
    print(f"About to upload {len(to_upload)} clip(s) to YouTube as '{privacy_status}': {', '.join(to_upload)}")
    confirm = input("Type 'y' to confirm: ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        return

    youtube = get_authenticated_service()
    for index in to_upload:
        try:
            response = upload_clip(video_id, index, youtube=youtube)
            set_approval(video_id, index, "uploaded")
            print(f"  clip_{index} -> https://youtu.be/{response['id']} ({privacy_status})")
        except Exception as e:
            print(f"  clip_{index} FAILED: {e}")


def schedule_approved_clips(video_id: str) -> None:
    """Queue approved clips onto the rate-limited upload schedule instead of
    uploading immediately - respects config.json's max_uploads_per_day and
    preferred_times. Actual upload happens later via "Process due uploads"."""
    approval = load_approval(video_id)
    approved = sorted(index for index, status in approval.items() if status == "approved")
    if not approved:
        print("No approved clips for this video yet. Approve clips first (menu option 3).")
        return

    for index in approved:
        try:
            entry = schedule_clip(video_id, index)
            set_approval(video_id, index, "scheduled")
            print(f"  clip_{index} scheduled for {entry['scheduled_for']}")
        except Exception as e:
            print(f"  clip_{index} FAILED to schedule: {e}")


def process_due_uploads() -> None:
    """Upload every scheduled clip (any video) whose time has come."""
    due = run_due_uploads()
    if not due:
        print("No scheduled uploads are due yet.")
        return
    for entry in due:
        video_id, index = entry["video_id"], entry["index"]
        if entry["status"] == "uploaded":
            set_approval(video_id, index, "uploaded")
            print(f"  clip_{index} of {video_id} -> https://youtu.be/{entry['youtube_id']}")
        else:
            print(f"  clip_{index} of {video_id} FAILED: {entry.get('error')}")


def view_history() -> None:
    video_ids = list_processed_videos()
    if not video_ids:
        print("No processed videos yet.")
        return
    print("\nHistory:")
    for video_id in video_ids:
        approval = load_approval(video_id)
        candidates = _load_json(WORK_DIR / video_id / "candidates.json", [])
        counts = {"approved": 0, "rejected": 0, "pending": 0}
        for i in range(1, len(candidates) + 1):
            status = approval.get(f"{i:02d}", "pending")
            counts[status] = counts.get(status, 0) + 1
        print(f"  {video_id}: {len(candidates)} clip(s) - {counts}")


def _valid_clip_indices(video_id: str) -> list:
    candidates = _load_json(WORK_DIR / video_id / "candidates.json", [])
    return [f"{i:02d}" for i in range(1, len(candidates) + 1)]


def _choose_video_id() -> str:
    video_ids = list_processed_videos()
    if not video_ids:
        print("No processed videos yet. Use option 1 to process a URL first.")
        return ""
    print("\nProcessed videos:")
    for i, vid in enumerate(video_ids, start=1):
        print(f"  {i}. {vid}")
    choice = input("Choose a video number: ").strip()
    if not choice.isdigit() or not (1 <= int(choice) <= len(video_ids)):
        print("Invalid choice.")
        return ""
    return video_ids[int(choice) - 1]


def main() -> None:
    while True:
        print("\n1. Process URL")
        print("2. View generated clips")
        print("3. Approve clip")
        print("4. Reject clip")
        print("5. Upload approved clips")
        print("6. View history")
        print("7. Schedule approved clips (rate-limited queue)")
        print("8. Process due scheduled uploads")
        print("0. Exit")
        choice = input("> ").strip()

        if choice == "1":
            url = input("YouTube URL: ").strip()
            if url:
                try:
                    process_url(url)
                except RuntimeError as e:
                    print(f"\n{e}")
        elif choice == "2":
            video_id = _choose_video_id()
            if video_id:
                view_clips(video_id)
        elif choice == "3":
            video_id = _choose_video_id()
            if video_id:
                view_clips(video_id)
                index = input("Clip index to approve (e.g. 01): ").strip()
                if index not in _valid_clip_indices(video_id):
                    print(f"No clip_{index} for this video.")
                else:
                    set_approval(video_id, index, "approved")
                    print(f"clip_{index} approved.")
        elif choice == "4":
            video_id = _choose_video_id()
            if video_id:
                view_clips(video_id)
                index = input("Clip index to reject (e.g. 01): ").strip()
                if index not in _valid_clip_indices(video_id):
                    print(f"No clip_{index} for this video.")
                else:
                    set_approval(video_id, index, "rejected")
                    print(f"clip_{index} rejected.")
        elif choice == "5":
            video_id = _choose_video_id()
            if video_id:
                upload_approved_clips(video_id)
        elif choice == "6":
            view_history()
        elif choice == "7":
            video_id = _choose_video_id()
            if video_id:
                schedule_approved_clips(video_id)
        elif choice == "8":
            process_due_uploads()
        elif choice in ("0", "q", "exit"):
            break
        else:
            print("Invalid choice.")


def run_single_shot(url: str) -> None:
    """python main.py <url>: run the full pipeline, then approve/reject each
    clip and offer to upload, all in one pass without the menu loop."""
    try:
        video_id = process_url(url)
    except RuntimeError as e:
        print(f"\n{e}")
        return
    candidates = _load_json(WORK_DIR / video_id / "candidates.json", [])
    if not candidates:
        return  # process_url already explained why

    indices = _valid_clip_indices(video_id)
    print(f"\nREADY: {', '.join(f'clip_{i}.mp4' for i in indices)}")

    print("\nApprove clips:")
    for index in indices:
        answer = input(f"  Approve clip_{index}? [y/N]: ").strip().lower()
        set_approval(video_id, index, "approved" if answer == "y" else "rejected")

    view_clips(video_id)

    answer = input("\nUpload approved clips? [y/N]: ").strip().lower()
    if answer == "y":
        upload_approved_clips(video_id)
    else:
        print("Skipping upload.")


def run_batch(urls_path: str) -> None:
    """python main.py urls.txt: process every URL (one per line) through the
    pipeline unattended. Deliberately does NOT prompt for approve/upload per
    video - that would defeat "queued without manually restarting." Review,
    approval, and upload for each processed video stay a separate,
    human-supervised step via the interactive menu afterward."""
    lines = Path(urls_path).read_text(encoding="utf-8").splitlines()
    urls = [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]
    if not urls:
        print(f"No URLs found in {urls_path}.")
        return

    print(f"Batch mode: {len(urls)} URL(s) queued.")
    results = []
    for i, url in enumerate(urls, start=1):
        print(f"\n=== [{i}/{len(urls)}] {url} ===")
        try:
            video_id = process_url(url)
            candidates = _load_json(WORK_DIR / video_id / "candidates.json", [])
            results.append({"url": url, "video_id": video_id, "candidates": len(candidates), "error": None})
        except Exception as e:
            print(f"FAILED: {e}")
            results.append({"url": url, "video_id": None, "candidates": 0, "error": str(e)})

    print("\nBatch summary:")
    for r in results:
        if r["error"]:
            print(f"  {r['url']} -> FAILED: {r['error']}")
        else:
            print(f"  {r['video_id']}: {r['candidates']} candidate(s)")
    print("\nRun `python main.py` (no argument) to review, approve, and upload clips for each video above.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--url":
            # Milestone 20's final command shape: `python main.py --url "..."`,
            # equivalent to the plain positional-URL form below.
            if len(sys.argv) < 3:
                print("Usage: python main.py --url <youtube_url>")
                sys.exit(1)
            run_single_shot(sys.argv[2])
        else:
            arg = sys.argv[1]
            if Path(arg).is_file():
                run_batch(arg)
            else:
                run_single_shot(arg)
    else:
        main()
