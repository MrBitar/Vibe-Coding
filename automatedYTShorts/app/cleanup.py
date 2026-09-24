"""Milestone 18: delete disposable intermediate files once their downstream
artifact exists, so processing many videos doesn't slowly fill the disk with
extracted audio and raw/vertical clip intermediates nobody looks at again.

Deliberately conservative: never touches source.mp4 (still needed if this
video is reprocessed for new candidates) or whichever clip file is actually
the final deliverable (vertical.mp4 when captions are disabled, since
there's nothing downstream of it in that case). Everything this deletes is
fully recoverable by re-running the relevant stage(s) from source.mp4 - it
just costs the re-encode time again, the same tradeoff already accepted for
audio.wav vs. source.mp4.
"""

from config import load_config
from utils import OUTPUT_DIR, WORK_DIR


def _cleanup_enabled() -> bool:
    return load_config().get("cleanup", {}).get("delete_intermediate_files", True)


def cleanup_audio(video_id: str) -> None:
    """Delete work/<id>/audio.wav once transcript.json exists. audio.wav is
    only ever read by transcribe(), which always checks transcript.json
    first - so once that exists, audio.wav will never be touched again."""
    if not _cleanup_enabled():
        return
    video_dir = WORK_DIR / video_id
    audio_path = video_dir / "audio.wav"
    if audio_path.exists() and (video_dir / "transcript.json").exists():
        audio_path.unlink()


def cleanup_clip_intermediates(video_id: str) -> None:
    """Delete each clip's raw/vertical intermediates once the stage
    downstream of them has produced its own output: clip_NN_raw.mp4 once
    clip_NN_vertical.mp4 exists (vertical.py never reads raw.mp4 again once
    its own output is there, regardless of the captions setting), and
    clip_NN_vertical.mp4 once clip_NN_captioned.mp4 exists - but only when
    captions are enabled, since with captions disabled vertical.mp4 IS the
    final deliverable and must be kept."""
    if not _cleanup_enabled():
        return
    captions_enabled = load_config().get("captions", {}).get("enabled", True)
    clip_dir = OUTPUT_DIR / video_id

    for raw_path in clip_dir.glob("clip_*_raw.mp4"):
        index = raw_path.name.removeprefix("clip_").removesuffix("_raw.mp4")
        vertical_path = clip_dir / f"clip_{index}_vertical.mp4"
        if vertical_path.exists():
            raw_path.unlink()

    if captions_enabled:
        for vertical_path in clip_dir.glob("clip_*_vertical.mp4"):
            index = vertical_path.name.removeprefix("clip_").removesuffix("_vertical.mp4")
            captioned_path = clip_dir / f"clip_{index}_captioned.mp4"
            if captioned_path.exists():
                vertical_path.unlink()
