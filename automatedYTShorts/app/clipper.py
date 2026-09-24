"""Milestone 6: cut candidate clips out of source.mp4 into separate files."""

import json
import sys

from silence_removal import build_trim_concat_filter, total_kept_duration
from utils import OUTPUT_DIR, WORK_DIR, atomic_output, check_free_disk_space, find_executable, run_ffmpeg, run_in_parallel


def _cut_one(job: dict) -> dict:
    i, c = job["index"], job["candidate"]
    clip_path = job["output_dir"] / f"clip_{i:02d}_raw.mp4"
    # kept_ranges (clip_finder.py, Milestone 19) is the source-video-absolute
    # ranges to keep, with any internal dead-air gap already shortened. With
    # no candidates.json regenerated since before that milestone, or with
    # silence removal disabled, this is just the single [start, end] span -
    # the same cut this always did.
    kept_ranges = c.get("kept_ranges") or [[c["start"], c["end"]]]
    result = {
        "index": i, "path": str(clip_path),
        "start": c["start"], "end": c["end"], "duration": round(total_kept_duration(kept_ranges), 2),
    }

    if clip_path.exists():
        return result

    try:
        with atomic_output(clip_path) as tmp_path:
            cmd = [
                job["ffmpeg"], "-y",
                "-i", str(job["source_path"]),
                "-filter_complex", build_trim_concat_filter(kept_ranges),
                "-map", "[outv]", "-map", "[outa]",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "aac",
                str(tmp_path),
            ]
            run_ffmpeg(cmd)
    except RuntimeError as e:
        print(f"  clip_{i:02d} FAILED to cut: {e}")
        return None

    return result


def cut_clips(video_id: str) -> list:
    """Cut each work/<id>/candidates.json entry into output/<id>/clip_NN_raw.mp4.
    Clips are independent (each writes its own file), so they're cut in
    parallel rather than one ffmpeg process at a time."""
    video_dir = WORK_DIR / video_id
    source_path = video_dir / "source.mp4"
    candidates_path = video_dir / "candidates.json"

    if not source_path.exists():
        raise FileNotFoundError(f"No source video found at {source_path}")
    if not candidates_path.exists():
        raise FileNotFoundError(f"No candidates found at {candidates_path}")

    with open(candidates_path, encoding="utf-8") as f:
        candidates = json.load(f)

    output_dir = OUTPUT_DIR / video_id
    output_dir.mkdir(parents=True, exist_ok=True)
    check_free_disk_space(output_dir)

    ffmpeg = find_executable("ffmpeg")
    jobs = [
        {"index": i, "candidate": c, "source_path": source_path, "output_dir": output_dir, "ffmpeg": ffmpeg}
        for i, c in enumerate(candidates, start=1)
    ]
    return run_in_parallel(jobs, _cut_one)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/clipper.py <video_id>")
        sys.exit(1)

    result = cut_clips(sys.argv[1])
    print(json.dumps(result, indent=2))
    print(f"{len(result)} clip(s) cut")
