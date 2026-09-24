"""The "I can see what it does" piece: console output of the recognized
board + planned moves, plus an optional live annotated overlay window."""
from __future__ import annotations

from typing import List, Optional

import cv2
import numpy as np

from .layout import Layout
from .models import GameState
from .solver.base import Move

WINDOW_NAME = "Solitaire Bot - what it sees"


def print_state(state: GameState) -> None:
    print("-" * 70)
    print(str(state))


def print_plan(moves: Optional[List[Move]]) -> None:
    if not moves:
        print("No moves found.")
        return
    print(f"Plan found: {len(moves)} moves")
    for i, m in enumerate(moves, 1):
        print(f"  {i:3}. {m}")


def print_progress(i: int, total: int, move: Move) -> None:
    print(f"[{i}/{total}] {move}")


class OverlayWindow:
    """A live CV2 window annotating what the bot currently believes about
    the board and what it's about to do next. Purely informational - never
    read for logic."""

    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def show(self, frame: np.ndarray, layout: Layout, state: GameState, next_move: Optional[Move] = None) -> None:
        if not self.enabled:
            return
        canvas = frame.copy()
        centers = {}
        for name, region in layout.piles.items():
            pile = state.piles.get(name)
            count = len(pile) if pile else 0
            top_left = (region.x, region.y)
            bottom_right = (region.x + region.w, region.y + region.h)
            cv2.rectangle(canvas, top_left, bottom_right, (0, 200, 0), 1)
            label = f"{name} ({count})"
            cv2.putText(canvas, label, (region.x, max(region.y - 6, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 0), 1, cv2.LINE_AA)
            centers[name] = (region.x + region.w // 2, region.y + region.h // 2)

        if next_move and next_move.source in centers and next_move.dest in centers:
            cv2.arrowedLine(canvas, centers[next_move.source], centers[next_move.dest],
                             (0, 0, 255), 2, tipLength=0.08)
            cv2.putText(canvas, str(next_move), (10, canvas.shape[0] - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)

        cv2.imshow(WINDOW_NAME, canvas)
        cv2.waitKey(1)

    def close(self) -> None:
        if self.enabled:
            try:
                cv2.destroyWindow(WINDOW_NAME)
            except cv2.error:
                pass  # window was never shown
