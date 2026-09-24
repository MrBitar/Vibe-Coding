"""Generates a bundled set of card corner-index templates (rank + suit) with
OpenCV drawing primitives - no external image assets, no user calibration
step, fully offline.

This is what makes recognition work with zero input from you: instead of
you clicking on 52 real cards to build a template set, the bot ships with a
synthetic one and matches it at multiple scales (since real corner-index
size varies a lot between games/skins). It's inherently a best-effort
stand-in for a real game's font - see README for how to override it with
real captured templates for a specific game if accuracy is poor.
"""
from __future__ import annotations

from typing import Dict, List

import cv2
import numpy as np

from .models import RANK_ORDER, Suit

CORNER_SIZE = (28, 40)  # (width, height) - roughly a classic corner-index box, big
                        # enough for the three-lobe club/spade shapes to read clearly


def _draw_suit(canvas: np.ndarray, suit_code: str, cx: int, cy: int, r: int) -> None:
    color = 0
    lobe = max(2, int(r * 0.5))
    if suit_code == "H":  # heart: two round lobes + a pointed bottom
        cv2.circle(canvas, (cx - lobe, cy - lobe // 2), lobe, color, -1)
        cv2.circle(canvas, (cx + lobe, cy - lobe // 2), lobe, color, -1)
        pts = np.array([[cx - r, cy - r // 4], [cx + r, cy - r // 4], [cx, cy + r]], np.int32)
        cv2.fillPoly(canvas, [pts], color)
    elif suit_code == "D":  # diamond: a narrow rhombus
        pts = np.array(
            [[cx, cy - r], [cx + int(r * 0.65), cy], [cx, cy + r], [cx - int(r * 0.65), cy]], np.int32
        )
        cv2.fillPoly(canvas, [pts], color)
    elif suit_code == "C":  # club: three round lobes with visible gaps + a stem
        gap = max(lobe + 1, int(lobe * 1.5))
        cv2.circle(canvas, (cx, cy - gap), lobe, color, -1)
        cv2.circle(canvas, (cx - gap, cy + lobe // 3), lobe, color, -1)
        cv2.circle(canvas, (cx + gap, cy + lobe // 3), lobe, color, -1)
        cv2.rectangle(canvas, (cx - max(1, r // 6), cy + lobe // 2), (cx + max(1, r // 6), cy + r), color, -1)
    elif suit_code == "S":  # spade: a sharp point with a distinct waist above the lobes + a stem
        pts = np.array([[cx, cy - r], [cx - int(r * 0.75), cy], [cx + int(r * 0.75), cy]], np.int32)
        cv2.fillPoly(canvas, [pts], color)
        cv2.circle(canvas, (cx - lobe, cy + lobe // 2), lobe, color, -1)
        cv2.circle(canvas, (cx + lobe, cy + lobe // 2), lobe, color, -1)
        cv2.rectangle(canvas, (cx - max(1, r // 6), cy + lobe), (cx + max(1, r // 6), cy + r), color, -1)


def render_corner(rank: str, suit_code: str, layout: str = "stacked", size=CORNER_SIZE) -> np.ndarray:
    """A small grayscale image: rank text + a suit glyph, white background,
    black ink. Real corner indices lay these out differently from game to
    game - `layout` picks between the common conventions."""
    w, h = size
    canvas = np.full((h, w), 255, dtype=np.uint8)
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.42 if len(rank) == 1 else 0.34

    if layout == "side":
        # rank and suit side by side, both in the upper portion - common on
        # skins with a bold/large corner index (e.g. web solitaire clones).
        cv2.putText(canvas, rank, (0, int(h * 0.34)), font, scale, 0, 1, cv2.LINE_AA)
        _draw_suit(canvas, suit_code, int(w * 0.72), int(h * 0.42), max(4, int(w * 0.32)))
    else:
        # rank stacked directly over a smaller suit glyph - the classic
        # Bicycle-style corner index.
        cv2.putText(canvas, rank, (1, int(h * 0.36)), font, scale, 0, 1, cv2.LINE_AA)
        _draw_suit(canvas, suit_code, w // 2, int(h * 0.72), max(4, int(w * 0.42)))
    return canvas


def bundled_templates() -> Dict[str, List[np.ndarray]]:
    """Each card maps to a list of layout variants - matching compares
    against all of them and keeps the best score, since there's no way to
    know in advance which convention a given game's skin follows."""
    templates: Dict[str, List[np.ndarray]] = {}
    for suit in Suit:
        for rank in RANK_ORDER:
            name = f"{rank}{suit.value}"
            templates[name] = [
                render_corner(rank, suit.value, "stacked"),
                render_corner(rank, suit.value, "side"),
            ]
    return templates
