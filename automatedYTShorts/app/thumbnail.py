"""Milestone 19: generate a thumbnail image for each clip - a frame likely
to grab attention in YouTube's thumbnail grid, preferring a sampled frame
with the largest detected face over an arbitrary timestamp."""

import json
import sys

import cv2

from config import load_config
from face_detect import detect_faces, min_size_for_frame
from utils import OUTPUT_DIR, WORK_DIR, atomic_output, run_in_parallel

SAMPLE_COUNT = 12
# Skip the very start/end of the clip - the opening frame is often a
# mid-blink/mid-word moment and the closing frame is often a fade.
SAMPLE_RANGE = (0.08, 0.92)


def _best_frame(video_path):
    """Sample frames across the clip and return whichever has the largest
    detected face, falling back to a frame partway through the clip
    (whatever the first successful sample was) if no face is found anywhere."""
    cap = cv2.VideoCapture(str(video_path))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        raise RuntimeError(f"Could not read any frames from {video_path}")

    best_frame = None
    best_face_area = 0
    fallback_frame = None
    start_frac, end_frac = SAMPLE_RANGE
    for i in range(SAMPLE_COUNT):
        frac = start_frac + (end_frac - start_frac) * (i / max(SAMPLE_COUNT - 1, 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total_frames * frac))
        ok, frame = cap.read()
        if not ok:
            continue
        if fallback_frame is None:
            fallback_frame = frame

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detect_faces(gray, min_size_for_frame(gray))
        if len(faces) == 0:
            continue
        _, _, w, h = max(faces, key=lambda f: f[2] * f[3])
        area = w * h
        if area > best_face_area:
            best_face_area = area
            best_frame = frame

    cap.release()
    chosen = best_frame if best_frame is not None else fallback_frame
    if chosen is None:
        raise RuntimeError(f"Could not extract any usable frame from {video_path}")
    return chosen


def _thumbnail_one(job: dict) -> dict:
    index, clip_path, thumb_path = job["index"], job["clip_path"], job["thumb_path"]

    if thumb_path.exists():
        return {"index": index, "path": str(thumb_path)}
    if not clip_path.exists():
        # Upstream stage failed or skipped this index - don't halt thumbnail
        # generation for the rest of the clips over one missing file.
        print(f"  clip_{index} SKIPPED (no rendered clip found at {clip_path})")
        return None

    try:
        frame = _best_frame(clip_path)
        with atomic_output(thumb_path) as tmp_path:
            if not cv2.imwrite(str(tmp_path), frame):
                raise RuntimeError("cv2.imwrite failed")
    except Exception as e:
        print(f"  clip_{index} FAILED to generate thumbnail: {e}")
        return None

    return {"index": index, "path": str(thumb_path)}


def generate_thumbnails(video_id: str) -> list:
    """Generate output/<id>/clip_NN_thumbnail.jpg for each candidate clip,
    from its final rendered file (clip_NN_captioned.mp4, or
    clip_NN_vertical.mp4 if captions are disabled - the same file
    quality_control.py treats as the deliverable). Clips are independent, so
    thumbnails are generated in parallel."""
    candidates_path = WORK_DIR / video_id / "candidates.json"
    if not candidates_path.exists():
        raise FileNotFoundError(f"No candidates found at {candidates_path}")
    with open(candidates_path, encoding="utf-8") as f:
        candidates = json.load(f)

    captions_enabled = load_config().get("captions", {}).get("enabled", True)
    suffix = "_captioned.mp4" if captions_enabled else "_vertical.mp4"
    clip_dir = OUTPUT_DIR / video_id

    jobs = []
    for i in range(1, len(candidates) + 1):
        index = f"{i:02d}"
        jobs.append({
            "index": index,
            "clip_path": clip_dir / f"clip_{index}{suffix}",
            "thumb_path": clip_dir / f"clip_{index}_thumbnail.jpg",
        })
    return run_in_parallel(jobs, _thumbnail_one)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/thumbnail.py <video_id>")
        sys.exit(1)

    result = generate_thumbnails(sys.argv[1])
    print(json.dumps(result, indent=2))
    print(f"{len(result)} thumbnail(s) generated")
