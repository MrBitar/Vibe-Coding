"""Live speed control: this is the "I control the speed it moves" piece.

Global hotkeys (via the `keyboard` package) let you speed up, slow down, and
pause/resume while the bot is running, on top of the initial --delay you
pass on the command line. If `keyboard` can't install a global hook (e.g.
sandboxed/headless environment) we degrade gracefully to CLI-only control.
"""
from __future__ import annotations

import threading
import time


class SpeedController:
    HOTKEYS_ENABLED = True

    def __init__(self, initial_delay: float = 0.6, step: float = 0.1):
        self.delay_s = initial_delay
        self.step = step
        self.paused = False
        self._lock = threading.Lock()
        self._hotkeys_active = False
        self._register_hotkeys()

    def _register_hotkeys(self) -> None:
        if not self.HOTKEYS_ENABLED:
            return
        try:
            import keyboard  # imported lazily; optional dependency at runtime

            keyboard.add_hotkey("+", self.speed_up)
            keyboard.add_hotkey("-", self.slow_down)
            keyboard.add_hotkey("space", self.toggle_pause)
            self._hotkeys_active = True
            print("[controller] hotkeys active: '+' faster, '-' slower, space = pause/resume")
        except Exception as exc:  # pragma: no cover - environment dependent
            print(f"[controller] global hotkeys unavailable ({exc}); use CLI --delay instead")

    def speed_up(self) -> None:
        with self._lock:
            self.delay_s = max(0.05, self.delay_s - self.step)
        print(f"[speed] delay={self.delay_s:.2f}s")

    def slow_down(self) -> None:
        with self._lock:
            self.delay_s += self.step
        print(f"[speed] delay={self.delay_s:.2f}s")

    def toggle_pause(self) -> None:
        self.paused = not self.paused
        print("[paused]" if self.paused else "[resumed]")

    def wait_if_paused(self) -> None:
        while self.paused:
            time.sleep(0.1)

    def delay(self) -> float:
        with self._lock:
            return self.delay_s

    def move_duration(self) -> float:
        """How long the simulated drag itself takes - scales with delay so
        'slower' also looks slower, not just more paused between moves."""
        return min(0.6, max(0.05, self.delay() * 0.4))
