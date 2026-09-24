"""
Jarvis Brain
Simple rule-based intent matching for now (no LLM yet). Swap this module
out for a local LLM later without touching main.py — everything else only
ever calls process(text).
"""

import re
from datetime import datetime

from app import memory

_GREETING = re.compile(r"\b(hello|hi|hey|good morning|good evening|good afternoon)\b", re.I)
_NAME_TELL = re.compile(r"\bmy name is (?P<name>[\w\s]+?)[.!]?$", re.I)
_NAME_ASK = re.compile(r"\bwhat('?s| is) my name\b", re.I)
_WHO_ARE_YOU = re.compile(r"\bwho are you\b|\bwhat('?s| is) your name\b", re.I)
_TIME_ASK = re.compile(r"\bwhat('?s| is)?\s*(the )?time\b|\bcurrent time\b", re.I)
_DATE_ASK = re.compile(r"\bwhat('?s| is) (the )?date\b|\bwhat day\b", re.I)
_HELP_ASK = re.compile(r"\bhelp\b|\bwhat can you do\b", re.I)

HELP_TEXT = (
    "Right now I understand a few basics: greetings, telling you the time "
    "or date, remembering your name (\"my name is ...\"), and recalling it "
    "(\"what's my name\"). Ask me for 'help' any time — I'll grow from here."
)


def process(text: str) -> str:
    """Take a line of user text, return Jarvis's reply."""
    text = text.strip()
    if not text:
        return "I didn't catch that."

    name_tell = _NAME_TELL.search(text)
    if name_tell:
        name = name_tell.group("name").strip().title()
        memory.set("user_name", name)
        return f"Got it. I'll remember that your name is {name}."

    if _NAME_ASK.search(text):
        name = memory.get("user_name")
        return f"You told me your name is {name}." if name else "You haven't told me your name yet."

    if _WHO_ARE_YOU.search(text):
        return "I'm Jarvis, your offline personal assistant."

    if _TIME_ASK.search(text):
        return f"It's {datetime.now().strftime('%H:%M')}."

    if _DATE_ASK.search(text):
        return f"Today is {datetime.now().strftime('%A, %B %d, %Y')}."

    if _HELP_ASK.search(text):
        return HELP_TEXT

    if _GREETING.search(text):
        name = memory.get("user_name")
        return f"Hello, {name}." if name else "Hello, Sir."

    return (
        "I'm not sure how to help with that yet. My brain is still simple — "
        "ask me for 'help' to see what I can do."
    )
