"""Turns a solved Move into actual mouse input, at a pace controlled by
SpeedController. This is the only module that touches the real mouse -
everything above it works in pure GameState/Move terms."""
from __future__ import annotations

import time
from typing import Tuple

import pyautogui

from .controller import SpeedController
from .layout import Layout
from .models import GameState
from .solver.base import Move

pyautogui.FAILSAFE = True  # yank the mouse to a screen corner to emergency-abort


class Executor:
    def __init__(self, layout: Layout, speed: SpeedController, dry_run: bool = False):
        self.layout = layout
        self.speed = speed
        self.dry_run = dry_run

    def _point(self, pile_name: str, state: GameState, from_top_offset: int = 0) -> Tuple[int, int]:
        region = self.layout.piles[pile_name]
        pile = state.piles[pile_name]
        idx = max(len(pile) - 1 - from_top_offset, 0)
        x = region.x + region.w // 2
        y = region.y + idx * region.stack_offset + region.h // 4
        if self.layout.capture_region:
            x += self.layout.capture_region.get("left", 0)
            y += self.layout.capture_region.get("top", 0)
        return x, y

    def perform(self, move: Move, state_before: GameState) -> None:
        # A run of `count` cards is grabbed starting from the first card of
        # the group, not the current topmost card.
        src_x, src_y = self._point(move.source, state_before, from_top_offset=move.count - 1)
        dst_x, dst_y = self._point(move.dest, state_before, from_top_offset=0)

        print(f"[executor] {move}" + (" (dry run)" if self.dry_run else ""))
        self.speed.wait_if_paused()

        if self.dry_run:
            time.sleep(self.speed.delay())
            return

        duration = self.speed.move_duration()
        pyautogui.moveTo(src_x, src_y, duration=duration)
        pyautogui.mouseDown()
        pyautogui.moveTo(dst_x, dst_y, duration=duration)
        pyautogui.mouseUp()
        time.sleep(self.speed.delay())
