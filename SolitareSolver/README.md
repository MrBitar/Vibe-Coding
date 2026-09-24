# Solitaire Solving Bot

An offline Python bot that watches a solitaire game on screen, solves it,
and plays the moves back itself — at a speed you control, showing you what
it recognized and what it's about to do at every step. No manual setup
required: point it at a game and run it.

Currently implements **Klondike** rules end-to-end (deal, solve, play). The
architecture is split so other variants (Spider, FreeCell, ...) can be added
as a new file under `solitaire_bot/solver/` without touching capture,
perception, execution, or the CLI.

## How "any game, any platform, zero input" actually works

There's no universal magic card-reader — instead:

- **Capture** and **input** are done via raw screen pixels and OS-level
  mouse events (`mss`, `pyautogui`), so they work against *any* window on
  *any* OS, because they never touch a specific game's code or memory.
- **Pile positions are auto-detected**, not hand-drawn. `run` looks for
  card-shaped border rectangles (`autolayout.py`, OpenCV contour/edge
  analysis), groups them into piles, and works out which is stock/waste/
  foundation/tableau purely from where they sit on screen. It saves what it
  finds to `layouts/layout.json` and reuses that next time.
- **Cards are recognized against a bundled synthetic template set**
  (`synthetic_templates.py`) — small rank+suit images generated with OpenCV
  drawing primitives, not real card art, so there's nothing to capture
  before this can run either.
- **Everything is offline.** No network calls, no cloud OCR/vision APIs —
  all detection and matching runs locally via OpenCV.

## Install

```
pip install -r requirements.txt
```

## 1. Try it with no game at all (`demo`)

Solves a randomly shuffled Klondike deal and "plays" it in the console, so
you can see the solver and speed control working before pointing it at a
real game:

```
python -m solitaire_bot.main demo --seed 42 --delay 0.4
```

You'll see the dealt board, the full move plan, and then each move printed
one at a time at the pace set by `--delay` (seconds between moves).

## 2. Run it for real

Open your solitaire game so the board is visible, then:

```
python -m solitaire_bot.main run --dry-run
```

First run: it auto-detects every pile's position from the screen, saves
that layout, then recognizes the board, solves it, and prints/shows the
full plan — `--dry-run` means it prints each move as it "executes" it but
never touches the mouse. Once you're confident the recognized board matches
reality, drop `--dry-run` to let it actually play.

Useful flags:

- `--delay 0.3` — seconds paused between moves (speed control)
- `--no-overlay` — disable the live annotated CV window
- `--redetect` — ignore the saved layout and auto-detect again (e.g. after
  resizing the game window)
- `--match-threshold 0.85` — stricter card-recognition matching

## Speed & visibility while it's running

- Console output shows the recognized board, the full plan before it
  starts, and each move as it's played.
- A live CV window (unless `--no-overlay`) draws the pile regions and an
  arrow for the move about to happen.
- While running, global hotkeys adjust pace live: `+` faster, `-` slower,
  `space` pause/resume (needs the `keyboard` package's hook to work in your
  environment — if it can't install one, it prints a message and falls
  back to the `--delay` you started with).
- `pyautogui`'s fail-safe is on: yank the mouse to a screen corner to abort
  immediately.

## If recognition isn't reliable enough on your game (optional)

The synthetic template set is a stand-in for a real font, not a copy of
one, so how well it reads ranks/suits varies by game — some skins it reads
fine, others (especially ones with large, bold, non-standard corner
indices) it mostly can't. When it's unsure it marks a card as face-down/
unknown rather than guessing, so the solver just won't act on it — this
keeps a bad read from turning into a wrong move, but it also means a game
it reads poorly won't play well either.

If that happens, `calibrate.py` lets you fix it **without redoing pile
detection** — it's an accuracy upgrade, not a required setup step:

```
python -m solitaire_bot.calibrate templates
```

Click directly on a card's rank/suit corner, type its name (e.g. `AS`,
`10H`, `KC`) in the terminal, press Enter. Repeat for whichever cards are
visible — you won't see all 52 in one screenshot, so re-run this as more
cards get revealed during play. Real captures always take priority over
the synthetic template for that card.

If auto-detection ever gets a pile's position wrong, `python -m
solitaire_bot.calibrate regions` lets you hand-fix `layouts/layout.json`
the same way (drag a box, answer prompts) instead of relying on detection.

## Known limitations

- Only Klondike is implemented as a solver. Not every Klondike deal is
  winnable — if no full solution is found within the search budget
  (`--node-budget`), it plays the best partial progress it found instead.
- Auto-detected pile *roles* assume the common convention (stock+waste
  upper-left, foundations upper-right, tableau fanned below). A mirrored or
  unusual layout may get misclassified — `calibrate.py regions` can fix it.
- The bot's model of the board advances by simulating its own moves, not
  by re-checking the screen after every move. If a game animates
  unpredictably or a click misses, the model and reality can drift —
  watch the overlay/console and use `space` to pause if it looks wrong.
