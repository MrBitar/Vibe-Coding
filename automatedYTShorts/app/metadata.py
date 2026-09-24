"""Milestone 10: generate title/description/hashtags for each approved clip."""

import json
import re
import sys

from utils import WORK_DIR, write_json_atomic

TITLE_MAX_LENGTH = 95
DESCRIPTION_TEXT_MAX_LENGTH = 300


def _clean_title(hook: str, max_length: int = TITLE_MAX_LENGTH) -> str:
    """Turn a clip's hook text into a title: trimmed, capitalized, and cut
    at a word boundary rather than mid-word if it's too long. Deliberately
    does not invent clickbait - it reflects what's actually said in the
    clip (automatic hook rewriting is a later optional AI improvement)."""
    title = " ".join(hook.split()).strip().strip(",")
    if title:
        title = title[0].upper() + title[1:]
    if len(title) > max_length:
        truncated = title[:max_length]
        if " " in truncated:
            truncated = truncated.rsplit(" ", 1)[0]
        title = truncated.rstrip(",.")
    # A hook is often a mid-sentence fragment (clip_finder.py takes the
    # clip's first ~10 words as the hook). Ending on "..." reads as an
    # intentional teaser instead of a broken, arbitrarily cut-off sentence.
    if title and title[-1] not in ".!?" and not title.endswith("..."):
        title += "..."
    return title


def _hashtags(source_meta: dict, source_title: str) -> list:
    """A small, content-relevant tag set - #shorts plus a channel tag plus
    up to two keywords from the source video's own title. Deliberately kept
    short to avoid spammy keyword stuffing."""
    tags = ["#shorts"]

    channel = source_meta.get("channel")
    if channel:
        channel_tag = "#" + re.sub(r"[^\w]", "", channel, flags=re.UNICODE)
        if channel_tag != "#" and channel_tag not in tags:
            tags.append(channel_tag)

    words = re.findall(r"[^\W\d_]+", source_title, flags=re.UNICODE)
    for word in words:
        if len(word) > 3:
            tag = "#" + word.lower()
            if tag not in tags:
                tags.append(tag)
        if len(tags) >= 4:
            break

    return tags


def _description(clip_text: str, source_meta: dict, hashtags: list) -> str:
    text = " ".join(clip_text.split())
    if len(text) > DESCRIPTION_TEXT_MAX_LENGTH:
        text = text[:DESCRIPTION_TEXT_MAX_LENGTH].rsplit(" ", 1)[0] + "..."

    attribution = _source_attribution(source_meta)
    return f"{text}\n\n{attribution}\n\n{' '.join(hashtags)}"


def _source_attribution(source_meta: dict) -> str:
    title = source_meta.get("title", "")
    channel = source_meta.get("channel", "")
    url = source_meta.get("source_url", "")
    return f'From "{title}" by {channel} ({url})'


def generate_metadata(video_id: str) -> list:
    """Generate title/description/hashtags/source_attribution for each
    candidate clip, writing work/<id>/clip_metadata.json."""
    video_dir = WORK_DIR / video_id
    source_meta_path = video_dir / "metadata.json"
    candidates_path = video_dir / "candidates.json"
    if not source_meta_path.exists():
        raise FileNotFoundError(f"No source metadata found at {source_meta_path}")
    if not candidates_path.exists():
        raise FileNotFoundError(f"No candidates found at {candidates_path}")

    with open(source_meta_path, encoding="utf-8") as f:
        source_meta = json.load(f)
    with open(candidates_path, encoding="utf-8") as f:
        candidates = json.load(f)

    source_title = source_meta.get("title", "")
    results = []
    for i, c in enumerate(candidates, start=1):
        hashtags = _hashtags(source_meta, source_title)
        results.append({
            "index": f"{i:02d}",
            "title": _clean_title(c.get("hook", "")),
            "description": _description(c.get("text", ""), source_meta, hashtags),
            "hashtags": hashtags,
            "source_attribution": _source_attribution(source_meta),
        })

    write_json_atomic(video_dir / "clip_metadata.json", results, indent=2, ensure_ascii=False)

    return results


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python app/metadata.py <video_id>")
        sys.exit(1)

    result = generate_metadata(sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"{len(result)} clip(s) got metadata")
