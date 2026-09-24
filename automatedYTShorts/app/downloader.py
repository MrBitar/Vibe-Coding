"""Milestone 2: download a YouTube video to work/<id>/source.mp4."""

import json
import sys

import yt_dlp

from utils import WORK_DIR, check_free_disk_space, find_executable, write_json_atomic


def download(url: str) -> dict:
    """Download url to work/<id>/source.mp4 and return its metadata."""
    check_free_disk_space(WORK_DIR, min_gb=1.0)

    outtmpl = str(WORK_DIR / "%(id)s" / "source.%(ext)s")

    ydl_opts = {
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "outtmpl": outtmpl,
        "noplaylist": True,
    }

    ydl_opts["ffmpeg_location"] = find_executable("ffmpeg")

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    video_id = info["id"]
    video_dir = WORK_DIR / video_id
    video_path = video_dir / "source.mp4"

    metadata = {
        "video_id": video_id,
        "title": info.get("title"),
        "channel": info.get("channel") or info.get("uploader"),
        "duration": info.get("duration"),
        "source_url": url,
    }

    write_json_atomic(video_dir / "metadata.json", metadata, indent=2)

    metadata["video_path"] = str(video_path)
    return metadata


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/downloader.py <youtube_url>")
        sys.exit(1)

    result = download(sys.argv[1])
    print(json.dumps(result, indent=2))
