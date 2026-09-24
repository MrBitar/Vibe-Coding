"""Milestone 8: burn synchronized captions onto vertical clips."""

import json
import math
import sys

from config import load_config
from silence_removal import map_original_to_trimmed
from utils import OUTPUT_DIR, WORK_DIR, atomic_output, check_free_disk_space, find_executable, run_ffmpeg, run_in_parallel

# Style for burned-in captions: large, high-contrast, lifted above the
# bottom-of-screen zone where Shorts/Reels UI (like/comment/share) sits.
SUBTITLE_STYLE = (
    "FontName=Arial,FontSize=64,PrimaryColour=&H00FFFFFF,"
    "OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Bold=1,"
    "Alignment=2,MarginV=220,PlayResX=1080,PlayResY=1920"
)

# Animated (word-by-word pop) captions show far fewer words at once, so a
# larger, more colorful style reads better than the static one - the same
# high-contrast/high-placement reasoning as SUBTITLE_STYLE, just leaning
# into the punchier, TikTok/CapCut-style look this mode is going for.
ANIMATED_SUBTITLE_STYLE = (
    "FontName=Arial,FontSize=92,PrimaryColour=&H0000FFFF,"
    "OutlineColour=&H00000000,BorderStyle=1,Outline=4,Shadow=0,Bold=1,"
    "Alignment=2,MarginV=260,PlayResX=1080,PlayResY=1920"
)

# Long transcript segments (full sentences) get split into caption-sized
# chunks so captions stay short phrases rather than multi-line paragraphs.
MAX_WORDS_PER_CAPTION = 6
# Animated captions pop 1-2 words at a time rather than a whole phrase.
ANIMATED_WORDS_PER_CAPTION = 2


def _srt_timestamp(t: float) -> str:
    t = max(t, 0)
    hours, rem = divmod(t, 3600)
    minutes, seconds = divmod(rem, 60)
    whole_seconds = int(seconds)
    millis = int(round((seconds - whole_seconds) * 1000))
    return f"{int(hours):02d}:{int(minutes):02d}:{whole_seconds:02d},{millis:03d}"


def _split_into_caption_chunks(seg: dict, max_words: int = MAX_WORDS_PER_CAPTION) -> list:
    """Split a transcript segment into evenly-sized chunks of at most
    max_words, distributing the segment's duration proportionally by word
    count. Chunk sizes are balanced (differing by at most one word) rather
    than always taking a fixed max_words, which would otherwise leave a
    tiny, too-fast-to-read trailing chunk (e.g. a single leftover word)."""
    words = seg["text"].split()
    total_words = len(words)
    if total_words <= max_words:
        return [seg]

    num_chunks = math.ceil(total_words / max_words)
    base_size, remainder = divmod(total_words, num_chunks)
    duration = seg["end"] - seg["start"]

    chunks = []
    word_idx = 0
    for c in range(num_chunks):
        size = base_size + (1 if c < remainder else 0)
        chunk_words = words[word_idx:word_idx + size]
        chunks.append({
            "start": seg["start"] + duration * (word_idx / total_words),
            "end": seg["start"] + duration * ((word_idx + size) / total_words),
            "text": " ".join(chunk_words),
        })
        word_idx += size
    return chunks


def _split_into_word_groups(seg: dict, group_size: int = ANIMATED_WORDS_PER_CAPTION) -> list:
    """Split a segment into small groups of group_size words for animated
    (word-by-word pop) captions, using each word's own REAL timestamp
    (transcriber.py's word_timestamps=True) rather than interpolating -
    actual pauses/pacing within a segment aren't evenly spaced, so
    interpolation would make the pop timing feel slightly off. Falls back
    to the proportional interpolation used for static captions if this
    segment predates word-level timestamps (an older cached transcript.json
    written before this feature existed)."""
    words = seg.get("words") or []
    if not words:
        return _split_into_caption_chunks(seg, max_words=group_size)

    groups = []
    for i in range(0, len(words), group_size):
        chunk_words = words[i:i + group_size]
        groups.append({
            "start": chunk_words[0]["start"],
            "end": chunk_words[-1]["end"],
            "text": " ".join(w["word"] for w in chunk_words),
        })
    return groups


def build_srt(segments: list, kept_ranges: list, animated: bool = False) -> str:
    """Build SRT text for the segments overlapping the clip's kept_ranges,
    with timestamps mapped through map_original_to_trimmed() rather than a
    flat "minus clip start" - silence_removal.py may have shortened some
    internal gaps, which shifts everything after them in the actual cut
    clip's timeline."""
    chunk_fn = _split_into_word_groups if animated else _split_into_caption_chunks
    clip_start, clip_end = kept_ranges[0][0], kept_ranges[-1][1]
    lines = []
    index = 1
    for seg in segments:
        for chunk in chunk_fn(seg):
            clamped_start = max(chunk["start"], clip_start)
            clamped_end = min(chunk["end"], clip_end)
            if clamped_end <= clamped_start:
                continue
            start = map_original_to_trimmed(clamped_start, kept_ranges)
            end = map_original_to_trimmed(clamped_end, kept_ranges)
            if end <= start:
                continue
            lines.append(str(index))
            lines.append(f"{_srt_timestamp(start)} --> {_srt_timestamp(end)}")
            lines.append(chunk["text"].strip())
            lines.append("")
            index += 1
    return "\n".join(lines)


def _caption_one(job: dict) -> dict:
    index, clip_dir = job["index"], job["clip_dir"]
    vertical_path, captioned_path = job["vertical_path"], job["captioned_path"]
    srt_path = clip_dir / f"clip_{index}.srt"

    if captioned_path.exists():
        return {"index": index, "path": str(captioned_path), "srt_path": str(srt_path)}
    if not vertical_path.exists():
        # Upstream (clipper/vertical) failed or skipped this index - don't
        # halt the whole caption stage over one missing clip.
        print(f"  clip_{index} SKIPPED (no vertical clip found at {vertical_path})")
        return None

    srt_name = srt_path.name
    srt_text = build_srt(job["segments"], job["kept_ranges"], animated=job["animated"])
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_text)

    style = ANIMATED_SUBTITLE_STYLE if job["animated"] else SUBTITLE_STYLE
    try:
        # Run with cwd=clip_dir and relative filenames so the subtitles
        # filter argument doesn't need escaping for Windows drive-letter
        # colons/backslashes in ffmpeg's filtergraph syntax. atomic_output's
        # tmp file lives in clip_dir too, so its bare name is still valid
        # relative to that cwd.
        with atomic_output(captioned_path) as tmp_path:
            cmd = [
                job["ffmpeg"], "-y",
                "-i", vertical_path.name,
                "-vf", f"subtitles={srt_name}:force_style='{style}'",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "copy",
                tmp_path.name,
            ]
            run_ffmpeg(cmd, cwd=str(clip_dir))
    except RuntimeError as e:
        print(f"  clip_{index} FAILED to caption: {e}")
        return None

    return {"index": index, "path": str(captioned_path), "srt_path": str(srt_path)}


def add_captions(video_id: str) -> list:
    """Burn captions onto each output/<id>/clip_NN_vertical.mp4, writing
    clip_NN_captioned.mp4 and the clip_NN.srt used to generate it. Clips are
    independent, so they're captioned in parallel rather than one ffmpeg
    process at a time."""
    video_dir = WORK_DIR / video_id
    clip_dir = OUTPUT_DIR / video_id

    transcript_path = video_dir / "transcript.json"
    candidates_path = video_dir / "candidates.json"
    if not transcript_path.exists():
        raise FileNotFoundError(f"No transcript found at {transcript_path}")
    if not candidates_path.exists():
        raise FileNotFoundError(f"No candidates found at {candidates_path}")

    with open(transcript_path, encoding="utf-8") as f:
        segments = json.load(f)
    with open(candidates_path, encoding="utf-8") as f:
        candidates = json.load(f)

    check_free_disk_space(clip_dir)
    animated = load_config().get("captions", {}).get("animated", False)
    ffmpeg = find_executable("ffmpeg")
    jobs = []
    for i, c in enumerate(candidates, start=1):
        index = f"{i:02d}"
        kept_ranges = c.get("kept_ranges") or [[c["start"], c["end"]]]
        jobs.append({
            "index": index, "clip_dir": clip_dir,
            "vertical_path": clip_dir / f"clip_{index}_vertical.mp4",
            "captioned_path": clip_dir / f"clip_{index}_captioned.mp4",
            "segments": segments, "kept_ranges": kept_ranges, "ffmpeg": ffmpeg,
            "animated": animated,
        })
    return run_in_parallel(jobs, _caption_one)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/captions.py <video_id>")
        sys.exit(1)

    result = add_captions(sys.argv[1])
    print(json.dumps(result, indent=2))
    print(f"{len(result)} clip(s) captioned")
