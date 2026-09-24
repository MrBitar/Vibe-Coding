"""Screen capture. Uses mss - works on Windows/macOS/Linux, no network, no
game-specific hooks: it just grabs pixels, which is what makes the rest of
the pipeline platform-agnostic."""
from __future__ import annotations

from typing import Optional

import mss
import numpy as np


class ScreenCapturer:
    def __init__(self, region: Optional[dict] = None):
        """region: {"left": int, "top": int, "width": int, "height": int} or
        None to capture the primary monitor."""
        self.region = region
        self._sct = mss.mss()

    def grab(self) -> np.ndarray:
        """Returns an HxWx3 BGR numpy array (OpenCV-compatible)."""
        monitor = self.region or self._sct.monitors[1]
        shot = self._sct.grab(monitor)
        return np.array(shot)[:, :, :3]
