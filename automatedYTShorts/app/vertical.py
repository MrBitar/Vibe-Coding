"""Milestone 7: convert raw clips to vertical 9:16, cropped around any
detected face rather than blindly cropping the center."""

import json
import re
import subprocess
import sys

import cv2

from config import load_config
from face_detect import detect_faces, min_size_for_frame
from utils import OUTPUT_DIR, atomic_output, check_free_disk_space, find_executable, run_ffmpeg, run_in_parallel


def detect_face_center_fraction(video_path, samples: int = 16) -> float:
    """Sample frames across the clip and return the dominant face's
    area-weighted average horizontal center as a fraction of frame width
    (0=left edge, 1=right edge). Falls back to 0.5 (center) if no face is
    found in any sample."""
    cap = cv2.VideoCapture(str(video_path))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        return 0.5

    weighted_sum = 0.0
    weight_total = 0.0
    for i in range(samples):
        frame_idx = int(total_frames * (i + 0.5) / samples)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detect_faces(gray, min_size_for_frame(gray))
        if len(faces) == 0:
            continue
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])  # largest detected face
        area = w * h
        weighted_sum += ((x + w / 2) / frame.shape[1]) * area
        weight_total += area

    cap.release()
    return weighted_sum / weight_total if weight_total > 0 else 0.5


def _source_fps(video_path, ffprobe: str) -> float:
    """Read the input clip's own frame rate so the zoompan filter (Milestone
    19 zoom) can hold exactly one output frame per input frame - a mismatched
    fps would speed up or slow down the clip."""
    cmd = [
        ffprobe, "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=r_frame_rate", "-of", "default=nw=1:nk=1",
        str(video_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed to read frame rate for {video_path}: {proc.stderr.strip()}")
    num, _, den = proc.stdout.strip().partition("/")
    return float(num) / float(den or 1)


def _convert_one(job: dict) -> dict:
    raw_path, index, vertical_path = job["raw_path"], job["index"], job["vertical_path"]
    if vertical_path.exists():
        return {"index": index, "path": str(vertical_path), "face_center_fraction": None}

    face_fraction = detect_face_center_fraction(raw_path)

    # Scale so the full height fills the target, then crop the width to the
    # target, positioned around the detected face's horizontal center (falls
    # back to a plain center crop if no face was found).
    crop_x = f"(in_w-{job['width']})*{face_fraction:.4f}"
    vf = f"scale=-2:{job['height']},crop={job['width']}:{job['height']}:{crop_x}:0"

    if job["zoom_enabled"]:
        # Milestone 19: slow Ken-Burns-style push-in over the clip, capped at
        # max_zoom. zoompan (not a time-varying crop) is used because crop's
        # own w/h expressions are only evaluated once at init, not per frame.
        fps = _source_fps(raw_path, job["ffprobe"])
        vf += (
            f",fps={fps},zoompan="
            f"z='min({job['max_zoom']},1+{job['zoom_rate']}*on/{fps})':d=1:"
            "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={job['width']}x{job['height']}:fps={fps}"
        )

    try:
        with atomic_output(vertical_path) as tmp_path:
            cmd = [
                job["ffmpeg"], "-y",
                "-i", str(raw_path),
                "-vf", vf,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "copy",
                str(tmp_path),
            ]
            run_ffmpeg(cmd)
    except RuntimeError as e:
        print(f"  clip_{index} FAILED to convert to vertical: {e}")
        return None

    return {
        "index": index,
        "path": str(vertical_path),
        "face_center_fraction": round(face_fraction, 3),
    }


def convert_to_vertical(video_id: str) -> list:
    """Convert each output/<id>/clip_NN_raw.mp4 to a vertical clip_NN_vertical.mp4.
    Clips are independent, so they're converted in parallel rather than one
    ffmpeg process at a time."""
    config = load_config()
    video_cfg = config.get("video", {})
    width = video_cfg.get("width", 1080)
    height = video_cfg.get("height", 1920)
    zoom_cfg = config.get("zoom", {})
    zoom_enabled = zoom_cfg.get("enabled", False)
    zoom_rate = zoom_cfg.get("rate_per_second", 0.015)
    max_zoom = zoom_cfg.get("max_zoom", 1.2)

    clip_dir = OUTPUT_DIR / video_id
    raw_clips = sorted(clip_dir.glob("clip_*_raw.mp4"))
    if not raw_clips:
        raise FileNotFoundError(f"No raw clips found in {clip_dir}")
    check_free_disk_space(clip_dir)

    ffmpeg = find_executable("ffmpeg")
    ffprobe = find_executable("ffprobe")
    jobs = []
    for raw_path in raw_clips:
        index = re.search(r"clip_(\d+)_raw\.mp4$", raw_path.name).group(1)
        jobs.append({
            "raw_path": raw_path, "index": index,
            "vertical_path": clip_dir / f"clip_{index}_vertical.mp4",
            "width": width, "height": height, "ffmpeg": ffmpeg, "ffprobe": ffprobe,
            "zoom_enabled": zoom_enabled, "zoom_rate": zoom_rate, "max_zoom": max_zoom,
        })
    return run_in_parallel(jobs, _convert_one)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/vertical.py <video_id>")
        sys.exit(1)

    result = convert_to_vertical(sys.argv[1])
    print(json.dumps(result, indent=2))
    print(f"{len(result)} clip(s) converted to vertical")
