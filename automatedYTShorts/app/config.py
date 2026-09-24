"""Load config.json from the project root."""

import json

from utils import PROJECT_ROOT


def load_config() -> dict:
    with open(PROJECT_ROOT / "config.json", encoding="utf-8") as f:
        return json.load(f)
