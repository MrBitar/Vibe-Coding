"""Milestone 15: schedule approved clips onto a rate-limited upload queue.

Scheduling only controls WHEN this program calls the upload API - every
upload still goes up with config.json's configured privacyStatus (e.g.
"private"). It deliberately does NOT use YouTube's own publishAt
auto-publish-to-public feature, since that would flip a clip to public
automatically with no human in the loop at the moment it happens -
contrary to the project's "approval required before publishing" default.
"""

import json
from datetime import datetime, timedelta

from config import load_config
from utils import LOGS_DIR, write_json_atomic
from youtube_uploader import get_authenticated_service, load_upload_history, upload_clip

QUEUE_PATH = LOGS_DIR / "upload_queue.json"

# Guard against an infinite loop if config is misconfigured (e.g. 0 slots/day).
MAX_DAYS_TO_SEARCH = 366


def load_queue() -> list:
    if QUEUE_PATH.exists():
        with open(QUEUE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_queue(queue: list) -> None:
    write_json_atomic(QUEUE_PATH, queue, indent=2)


def is_scheduled(queue: list, video_id: str, index: str) -> bool:
    return any(
        e["video_id"] == video_id and e["index"] == index and e["status"] in ("queued", "uploaded")
        for e in queue
    )


def schedule_clip(video_id: str, index: str) -> dict:
    """Find the earliest future slot that respects max_uploads_per_day and
    preferred_times, append it to the queue, and return the new entry."""
    queue = load_queue()
    if is_scheduled(queue, video_id, index):
        raise RuntimeError(f"clip_{index} of {video_id} is already scheduled or uploaded.")
    if index in load_upload_history(video_id):
        raise RuntimeError(f"clip_{index} of {video_id} was already uploaded directly (outside the schedule).")

    youtube_cfg = load_config().get("youtube", {})
    max_per_day = youtube_cfg.get("max_uploads_per_day", 3)
    preferred_times = youtube_cfg.get("preferred_times", ["09:00", "13:00", "18:00"])
    if max_per_day <= 0 or not preferred_times:
        raise ValueError("config.json youtube.max_uploads_per_day and preferred_times must be set to schedule uploads.")

    now = datetime.now()
    day = now.date()
    for _ in range(MAX_DAYS_TO_SEARCH):
        day_entries = [e for e in queue if e["status"] in ("queued", "uploaded") and datetime.fromisoformat(e["scheduled_for"]).date() == day]
        used_times = {datetime.fromisoformat(e["scheduled_for"]).time() for e in day_entries}

        if len(day_entries) < max_per_day:
            for time_str in preferred_times:
                slot_time = datetime.strptime(time_str, "%H:%M").time()
                if slot_time in used_times:
                    continue
                slot = datetime.combine(day, slot_time)
                if slot <= now:
                    continue  # this slot has already passed today
                entry = {"video_id": video_id, "index": index, "scheduled_for": slot.isoformat(), "status": "queued"}
                queue.append(entry)
                save_queue(queue)
                return entry

        day += timedelta(days=1)
        now = datetime.combine(day, datetime.min.time())  # all slots are in the future for later days

    raise RuntimeError("Could not find an available upload slot within a year - check config.json youtube settings.")


def run_due_uploads() -> list:
    """Upload every queued entry whose scheduled_for time has passed."""
    queue = load_queue()
    now = datetime.now()
    due = [e for e in queue if e["status"] == "queued" and datetime.fromisoformat(e["scheduled_for"]) <= now]
    if not due:
        return []

    youtube = get_authenticated_service()
    for entry in due:
        try:
            response = upload_clip(entry["video_id"], entry["index"], youtube=youtube)
            entry["status"] = "uploaded"
            entry["youtube_id"] = response["id"]
        except Exception as e:
            entry["status"] = "failed"
            entry["error"] = str(e)

    save_queue(queue)
    return due
