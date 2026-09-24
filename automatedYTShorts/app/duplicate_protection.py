"""Milestone 16: track already-uploaded source segments and detect
duplicates BEFORE generating or uploading a clip again.

Re-running the same URL produces slightly different candidate timestamps
each time (faster-whisper's transcription is not perfectly deterministic
run-to-run), so exact timestamp matching is too fragile - a clip that
already went out as [125.2, 164.8] might reappear as [125.0, 165.1] on the
next run. Duplicates are therefore detected by timestamp OVERLAP against a
persistent history of already-uploaded segments for that video_id, not by
exact equality or by clip index (which isn't stable across runs either).
"""

import hashlib
import json
from datetime import datetime, timezone

from utils import LOGS_DIR, write_json_atomic

HISTORY_PATH = LOGS_DIR / "processed_segments.json"

# Two segments are treated as "the same" if their overlap covers at least
# this fraction of the shorter segment's duration.
OVERLAP_THRESHOLD = 0.5


def load_history() -> list:
    if HISTORY_PATH.exists():
        with open(HISTORY_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_history(history: list) -> None:
    write_json_atomic(HISTORY_PATH, history, indent=2)


def _overlap_ratio(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    intersection = max(0.0, min(a_end, b_end) - max(a_start, b_start))
    shorter = min(a_end - a_start, b_end - b_start)
    return intersection / shorter if shorter > 0 else 0.0


def segments_overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> bool:
    """The canonical "is this the same segment" definition, shared with
    clip_finder.py's approval-status migration so both use one threshold."""
    return _overlap_ratio(a_start, a_end, b_start, b_end) > OVERLAP_THRESHOLD


def is_duplicate_segment(video_id: str, start: float, end: float, history: list = None) -> bool:
    """True if [start, end] substantially overlaps an already-uploaded
    segment of the same source video."""
    if history is None:
        history = load_history()
    return any(
        entry["video_id"] == video_id and segments_overlap(start, end, entry["start"], entry["end"])
        for entry in history
    )


def filter_new_candidates(video_id: str, candidates: list) -> list:
    """Drop candidates whose segment overlaps one already uploaded for this
    video_id. Called at clip-selection time, before any rendering happens."""
    history = load_history()
    return [c for c in candidates if not is_duplicate_segment(video_id, c["start"], c["end"], history)]


def _file_hash(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def record_upload(video_id: str, start: float, end: float, clip_path, youtube_id: str) -> dict:
    """Record a segment as uploaded so future runs won't reprocess it."""
    history = load_history()
    entry = {
        "video_id": video_id,
        "start": start,
        "end": end,
        "clip_hash": _file_hash(clip_path),
        "youtube_id": youtube_id,
        "upload_date": datetime.now(timezone.utc).isoformat(),
    }
    history.append(entry)
    _save_history(history)
    return entry
