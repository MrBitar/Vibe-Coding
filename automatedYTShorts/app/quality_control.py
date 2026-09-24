"""Milestone 9: reject bad clips before they reach the approval/upload stage."""

import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone

from config import load_config
from utils import LOGS_DIR, OUTPUT_DIR, WORK_DIR, find_executable, write_json_atomic

DURATION_TOLERANCE_SECONDS = 2.0
SILENCE_PROBE_SECONDS = 1.5
SILENCE_NOISE_DB = -35
SILENCE_MIN_DURATION = 1.0

HASH_REGISTRY_PATH = LOGS_DIR / "clip_hashes.json"


def _probe(path, ffprobe: str) -> dict:
    cmd = [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return {}
    return json.loads(proc.stdout)


def _has_silent_beginning(path, ffmpeg: str) -> bool:
    cmd = [
        ffmpeg, "-i", str(path),
        "-t", str(SILENCE_PROBE_SECONDS),
        "-af", f"silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_DURATION}",
        "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return re.search(r"silence_start:\s*0(\.0+)?\b", proc.stderr) is not None


def _file_hash(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _check_duplicate(path, video_id: str, index: str) -> bool:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    registry = {}
    if HASH_REGISTRY_PATH.exists():
        with open(HASH_REGISTRY_PATH, encoding="utf-8") as f:
            registry = json.load(f)

    file_hash = _file_hash(path)
    existing = registry.get(file_hash)
    is_duplicate = bool(existing) and not (existing["video_id"] == video_id and existing["index"] == index)

    registry[file_hash] = {"video_id": video_id, "index": index, "path": str(path)}
    write_json_atomic(HASH_REGISTRY_PATH, registry, indent=2)

    return is_duplicate


def check_clip(video_id: str, index: str, clip_path, ffmpeg: str, ffprobe: str) -> dict:
    video_cfg = load_config().get("video", {})
    clip_cfg = load_config().get("clip", {})
    expected_width = video_cfg.get("width", 1080)
    expected_height = video_cfg.get("height", 1920)
    min_seconds = clip_cfg.get("min_seconds", 20)
    max_seconds = clip_cfg.get("max_seconds", 60)

    reasons = []

    if not clip_path.exists():
        return {"index": index, "path": str(clip_path), "passed": False, "reasons": ["file_missing"], "checks": {}}

    probe_data = _probe(clip_path, ffprobe)
    if not probe_data:
        return {"index": index, "path": str(clip_path), "passed": False, "reasons": ["not_playable"], "checks": {}}

    streams = probe_data.get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(probe_data.get("format", {}).get("duration", 0))

    if video_stream is None:
        reasons.append("no_video_stream")
    if audio_stream is None:
        reasons.append("no_audio_stream")

    width = video_stream.get("width") if video_stream else None
    height = video_stream.get("height") if video_stream else None
    resolution_ok = (width == expected_width and height == expected_height)
    if not resolution_ok:
        reasons.append("wrong_resolution")

    duration_ok = (min_seconds - DURATION_TOLERANCE_SECONDS) <= duration <= (max_seconds + DURATION_TOLERANCE_SECONDS)
    if not duration_ok:
        reasons.append("duration_out_of_range")

    silent_beginning = _has_silent_beginning(clip_path, ffmpeg)
    if silent_beginning:
        reasons.append("silent_beginning")

    is_duplicate = _check_duplicate(clip_path, video_id, index)
    if is_duplicate:
        reasons.append("duplicate_clip")

    checks = {
        "duration": round(duration, 2),
        "duration_ok": duration_ok,
        "resolution": [width, height],
        "resolution_ok": resolution_ok,
        "has_video": video_stream is not None,
        "has_audio": audio_stream is not None,
        "silent_beginning": silent_beginning,
        "duplicate": is_duplicate,
    }

    return {"index": index, "path": str(clip_path), "passed": len(reasons) == 0, "reasons": reasons, "checks": checks}


def run_quality_control(video_id: str) -> dict:
    """Check every candidate's final clip, writing output/<id>/report.json
    and logs/<id>.log. Returns the same report dict that gets written."""
    video_dir = WORK_DIR / video_id
    clip_dir = OUTPUT_DIR / video_id
    candidates_path = video_dir / "candidates.json"
    if not candidates_path.exists():
        raise FileNotFoundError(f"No candidates found at {candidates_path}")

    with open(candidates_path, encoding="utf-8") as f:
        candidates = json.load(f)

    captions_enabled = load_config().get("captions", {}).get("enabled", True)
    ffmpeg = find_executable("ffmpeg")
    ffprobe = find_executable("ffprobe")

    results = []
    for i in range(1, len(candidates) + 1):
        index = f"{i:02d}"
        suffix = "_captioned.mp4" if captions_enabled else "_vertical.mp4"
        clip_path = clip_dir / f"clip_{index}{suffix}"
        results.append(check_clip(video_id, index, clip_path, ffmpeg, ffprobe))

    report = {
        "video_id": video_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "clips": results,
        "passed_count": sum(1 for r in results if r["passed"]),
        "failed_count": sum(1 for r in results if not r["passed"]),
    }

    write_json_atomic(clip_dir / "report.json", report, indent=2)

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_lines = [f"Quality control report for {video_id} - {report['generated_at']}"]
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        detail = "" if r["passed"] else f" reasons={r['reasons']}"
        log_lines.append(f"[{status}] clip_{r['index']}: checks={r['checks']}{detail}")
    with open(LOGS_DIR / f"{video_id}.log", "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")

    return report


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/quality_control.py <video_id>")
        sys.exit(1)

    result = run_quality_control(sys.argv[1])
    print(json.dumps(result, indent=2))
    print(f"{result['passed_count']} passed, {result['failed_count']} failed")
