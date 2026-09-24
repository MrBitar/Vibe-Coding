"""Milestone 12: upload approved clips to YouTube via the Data API (OAuth)."""

import json
import sys

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from config import load_config
from duplicate_protection import is_duplicate_segment, record_upload
from utils import OUTPUT_DIR, PROJECT_ROOT, WORK_DIR, write_json_atomic

CREDENTIALS_DIR = PROJECT_ROOT / "credentials"
CLIENT_SECRET_PATH = CREDENTIALS_DIR / "client_secret.json"
TOKEN_PATH = CREDENTIALS_DIR / "token.json"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
]

DEFAULT_CATEGORY_ID = "22"  # "People & Blogs" - a safe generic default


def get_authenticated_service():
    """Return an authenticated YouTube Data API client, running the OAuth
    consent flow (opens a local browser) on first use and caching the
    resulting token in credentials/token.json for reuse afterward."""
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError(
            f"No OAuth client secret found at {CLIENT_SECRET_PATH}. "
            "Download it from Google Cloud Console (OAuth client ID, Desktop app "
            "type) and save it there before uploading."
        )

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        refreshed = False
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                refreshed = True
            except Exception:
                # Refresh token itself may have been revoked/expired - fall
                # back to a fresh consent flow instead of crashing.
                pass
        if not refreshed:
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        write_json_atomic(TOKEN_PATH, json.loads(creds.to_json()))

    return build("youtube", "v3", credentials=creds)


def upload_video(youtube, video_path, title: str, description: str, tags: list, privacy_status: str = "private") -> dict:
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": [t.lstrip("#") for t in tags],
            "categoryId": DEFAULT_CATEGORY_ID,
        },
        "status": {
            "privacyStatus": privacy_status,
        },
    }
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = request.execute()
    return response


def _set_thumbnail(youtube, youtube_id: str, thumbnail_path) -> None:
    """Best-effort: many channels aren't eligible for custom thumbnails via
    the API without phone verification, so a failure here must not fail the
    whole upload - the video itself already uploaded successfully."""
    try:
        media = MediaFileUpload(str(thumbnail_path))
        youtube.thumbnails().set(videoId=youtube_id, media_body=media).execute()
    except Exception as e:
        print(f"  (thumbnail not set: {e})")


def _upload_history_path(video_id: str):
    return WORK_DIR / video_id / "upload_history.json"


def load_upload_history(video_id: str) -> dict:
    path = _upload_history_path(video_id)
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_upload_history(video_id: str, history: dict) -> None:
    write_json_atomic(_upload_history_path(video_id), history, indent=2)


def upload_clip(video_id: str, index: str, youtube=None) -> dict:
    """Upload a single already-approved clip. Refuses to re-upload a clip
    that's already in this video's upload_history.json."""
    history = load_upload_history(video_id)
    if index in history:
        raise RuntimeError(f"clip_{index} for {video_id} was already uploaded (youtube_id={history[index]['youtube_id']}).")

    video_dir = WORK_DIR / video_id
    with open(video_dir / "clip_metadata.json", encoding="utf-8") as f:
        clip_metadata = json.load(f)
    meta = next((m for m in clip_metadata if m["index"] == index), None)
    if meta is None:
        raise ValueError(f"No metadata found for clip_{index} of {video_id}")

    with open(video_dir / "candidates.json", encoding="utf-8") as f:
        candidates = json.load(f)
    candidate = candidates[int(index) - 1]

    # Final check against already-uploaded segments of this source video -
    # catches cases where the same URL was reprocessed and produced a
    # different clip index covering a time range already published.
    if is_duplicate_segment(video_id, candidate["start"], candidate["end"]):
        raise RuntimeError(
            f"clip_{index} of {video_id} ({candidate['start']}-{candidate['end']}s) "
            "overlaps a segment that was already uploaded in a previous run."
        )

    clip_path = OUTPUT_DIR / video_id / f"clip_{index}_captioned.mp4"
    if not clip_path.exists():
        raise FileNotFoundError(f"No captioned clip found at {clip_path}")

    privacy_status = load_config().get("youtube", {}).get("privacy", "private")

    if youtube is None:
        youtube = get_authenticated_service()

    response = upload_video(
        youtube, clip_path,
        title=meta["title"],
        description=meta["description"],
        tags=meta["hashtags"],
        privacy_status=privacy_status,
    )

    thumbnail_path = OUTPUT_DIR / video_id / f"clip_{index}_thumbnail.jpg"
    if thumbnail_path.exists():
        _set_thumbnail(youtube, response["id"], thumbnail_path)

    history[index] = {"youtube_id": response["id"], "privacy_status": privacy_status}
    _save_upload_history(video_id, history)
    record_upload(video_id, candidate["start"], candidate["end"], clip_path, response["id"])
    return response


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python app/youtube_uploader.py <video_id> <clip_index>")
        sys.exit(1)

    result = upload_clip(sys.argv[1], sys.argv[2])
    print(f"Uploaded: https://youtu.be/{result['id']}")
