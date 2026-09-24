# CLAUDE.md

## Project

A solitaire-solving bot: it looks at a solitaire game on screen, works out how to win it, and plays the moves itself.

## Requirements

- **Language:** Python
- **Offline:** no network calls, no cloud APIs, no external services at runtime — everything (vision, solving, input) runs locally
- **Observable:** the bot must show what it's doing — the board state it recognized and the moves it's about to make — not just silently move the mouse
- **User controls speed:** the delay/speed between moves is a runtime-adjustable setting, not hardcoded
- **Game/platform agnostic:** must work against any solitaire variant (Klondike, Spider, FreeCell, etc.) on any platform, by observing the screen rather than hooking into a specific game's code or memory
- **Zero manual input:** no rectangle-drawing, no per-card template capture, no config editing required to start it against a new game — it must detect pile positions and recognize cards on its own. Manual calibration tools may still exist as an *optional* accuracy override, never as a required step.

## Implied architecture

Because it must be platform-agnostic and offline, the bot has to work purely from what's visibly on screen:

1. **Capture** — grab the game window/screen
2. **Perception** — recognize cards and board layout from the captured image (computer vision, no cloud OCR/vision APIs) and build an internal game state
3. **Solver** — given a game state, search for a winning (or best-effort) sequence of moves; solver logic should be pluggable per variant since the perception layer can't assume which game it's looking at
4. **Executor** — turns solved moves into simulated mouse/keyboard input, paced by the user-configured speed
5. **Visibility layer** — logs or overlays the recognized state and planned moves so the user can see what the bot believes and intends before/while it acts

## Conventions

- Keep perception, solving, and input-execution as separate, independently testable layers — the solver should never need to know about screen coordinates, and the executor should never need to know solitaire rules
- Speed control should be a single, obvious knob (e.g. one config value or CLI flag for per-move delay)
- Every move the executor makes should be visible somewhere first (console log, overlay, etc.) — no silent actions
- Avoid game-specific assumptions leaking into the perception or executor layers; variant-specific logic belongs in the solver
