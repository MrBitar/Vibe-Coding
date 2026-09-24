"""Turns a screen capture + a Layout into a GameState.

Recognition works with zero setup by default: `load_templates()` always
includes the bundled synthetic rank/suit templates (synthetic_templates.py)
so there's nothing to capture before this can run. If a `templates_dir` with
real captured templates for a specific game exists, those are merged in and
take priority per-card, since a real capture always beats a synthetic
stand-in - but they're an optional accuracy upgrade, not a requirement.

Every crop (synthetic template or real one) is compared at one canonical
size, so this works regardless of how big cards actually render on screen -
no multi-scale search needed, no need to know the font in advance.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from .layout import Layout
from .models import Card, GameState, Pile, PileType, Suit
from .synthetic_templates import CORNER_SIZE, bundled_templates

MAX_CARDS_PER_PILE = 20
BLANK_STD_THRESHOLD = 8.0  # below this, a crop is considered "no card here"
RED_SUITS = {"H", "D"}
BLACK_SUITS = {"S", "C"}


def load_templates(templates_dir: Optional[Path] = None) -> Dict[str, List[np.ndarray]]:
    """Bundled synthetic template variants, optionally overridden per-card
    by a real capture from `templates_dir` (see calibrate.py) if that
    directory has one. Everything is normalized to CORNER_SIZE so later
    matching is a same-size comparison regardless of where a template came
    from. A real capture replaces the synthetic variants for that card
    entirely - it's always a better match than a synthetic stand-in."""
    templates = bundled_templates()
    if templates_dir is not None:
        for path in sorted(Path(templates_dir).glob("*.png")):
            img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                templates[path.stem] = [cv2.resize(img, CORNER_SIZE, interpolation=cv2.INTER_AREA)]
    return templates


def _parse_card_name(name: str) -> Tuple[str, str]:
    return name[:-1], name[-1]


def _is_blank(crop: np.ndarray) -> bool:
    return crop.size == 0 or crop.std() < BLANK_STD_THRESHOLD


def _color_family(crop_bgr: np.ndarray) -> str:
    """Red vs black is reliable regardless of font/skin, so it's used to
    narrow the candidate suits before shape matching even has to try."""
    if crop_bgr.size == 0:
        return "black"
    b = crop_bgr[:, :, 0].astype(int)
    g = crop_bgr[:, :, 1].astype(int)
    r = crop_bgr[:, :, 2].astype(int)
    redness = (r - (g + b) // 2).mean()
    return "red" if redness > 10 else "black"


def _best_match(
    crop_gray: np.ndarray, templates: Dict[str, List[np.ndarray]], threshold: float, family: str
) -> Tuple[Optional[str], float]:
    if crop_gray.shape[:2] != CORNER_SIZE[::-1]:
        crop_gray = cv2.resize(crop_gray, CORNER_SIZE, interpolation=cv2.INTER_AREA)
    allowed = RED_SUITS if family == "red" else BLACK_SUITS

    best_name, best_score = None, -1.0
    for name, variants in templates.items():
        if name[-1] not in allowed:
            continue
        for tmpl in variants:
            res = cv2.matchTemplate(crop_gray, tmpl, cv2.TM_CCOEFF_NORMED)
            score = float(res.max())
            if score > best_score:
                best_score, best_name = score, name
    if best_name is not None and best_score >= threshold:
        return best_name, best_score
    return None, best_score


def recognize(
    frame: np.ndarray, layout: Layout, templates: Dict[str, List[np.ndarray]], threshold: float = 0.82
) -> GameState:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cc = layout.corner_crop
    piles: Dict[str, Pile] = {}

    for name, region in layout.piles.items():
        cards = []
        # stack_offset == 0 means "not fanned" (stock/waste/foundation) -
        # there is exactly one visible slot to sample, not MAX_CARDS_PER_PILE
        # identical samples of the same pixels.
        max_iter = MAX_CARDS_PER_PILE if region.stack_offset > 0 else 1
        for i in range(max_iter):
            x = region.x
            y = region.y + i * region.stack_offset
            top, left = y + cc["dy"], x + cc["dx"]
            bottom, right = top + cc["h"], left + cc["w"]
            if top < 0 or left < 0 or bottom > gray.shape[0] or right > gray.shape[1]:
                break
            crop_gray = gray[top:bottom, left:right]
            if _is_blank(crop_gray):
                break
            family = _color_family(frame[top:bottom, left:right])
            match, _score = _best_match(crop_gray, templates, threshold, family)
            if match:
                rank, suit_code = _parse_card_name(match)
                cards.append(Card(rank, _suit_from_code(suit_code), face_up=True))
            else:
                # A card is present (crop isn't blank) but didn't match any
                # known template: either it's face-down, or recognition
                # just isn't confident enough on this skin.
                cards.append(Card("?", _suit_from_code("S"), face_up=False))
        piles[name] = Pile(name, PileType(region.kind), cards)

    return GameState(piles)


def _suit_from_code(code: str) -> Suit:
    for suit in Suit:
        if suit.value == code:
            return suit
    raise ValueError(f"Unknown suit code: {code}")
