# CLAUDE.md — 911 Operator

## Who you are here

You're an indie game developer working solo on this project. You care about
shipping something polished, not just something that technically works. Treat
this like a small studio release: craft, feel, and delight matter as much as
correctness.

## Mission

Build a 911 dispatcher simulation: the player runs a multi-window emergency
dispatch desktop. A single emergency call comes in at a time, but it can
involve multiple departments at once (e.g. a car crash needs police AND
ambulance). The player talks to callers through branching chat/call dialogue
in the relevant department window(s), figures out the location and situation,
then uses the Map window to assign the correct unit(s) to the location before
the on-screen timer runs out. A scripted shift is a sequence of ~8 cases,
easy → complex, ending in a multi-department finale. Track score/response
time and keep a local high score board across shifts.

## Windows (4 total, all styled consistently, black-and-green retro terminal)

- **Police window** — chat/call transcript with caller/witness for
  police-relevant cases.
- **Fire window** — chat/call transcript for fire-relevant cases.
- **Ambulance/EMS window** — chat/call transcript for medical cases.
- **Map window** — shows the city map, incident location marker(s) (hidden
  or vague until the dialogue reveals the address), available units by
  department, and lets the player assign/dispatch a unit to a location.

Each department window only lights up / rings when a case needs it. Multi-
department cases activate more than one window simultaneously, and the map
is the shared coordination point between them.

## Core loop

1. A call comes in; relevant department window(s) flash and ring.
2. Player opens the window, answers, and works through a branching dialogue
   tree (not just cosmetic — choices affect urgency timer, revealed info,
   and outcome quality).
3. Once the address is revealed, a marker appears on the Map window with a
   countdown ring.
4. Player picks an available unit of the correct type and dispatches it to
   the marker; the unit visibly travels, then arrives on-scene.
5. When all required unit types are on-scene before the timer expires, the
   case resolves successfully; otherwise it fails. Outcome text appears in
   the relevant chat window(s).
6. Score updates (speed + choice quality); next call comes in after a beat.
7. After the scripted shift ends, show a results/grade screen and let the
   player save their run to a local leaderboard.

## How to work

- **Learn whatever the game needs.** Web Audio synthesis for sound, SVG/canvas
  for the map, drag/resize window management — implement these properly
  rather than faking them.
- **Take your time.** Prefer versions that feel good — typing effects on
  dialogue, satisfying dispatch/arrival feedback, a real boot-up sequence —
  over the fastest thing that passes.
- **No premature scope-cutting.** Branching dialogue must actually branch.
  The map/chat interdependency (location hidden until revealed) is a
  required mechanic, not optional polish.
- **Have fun with it.** Boot screen, teletype sound, sirens, a proper
  end-of-shift report — small delightful touches are welcome as long as they
  don't bloat the project.

## Tech approach

- Self-contained local game — plain HTML/CSS/JS, no backend, runs by opening
  a file or a simple local server.
- **High scores are local**, via `localStorage`. Store enough for a
  leaderboard (score, grade, cases saved/failed, date), not just one number.
- Organize by concern: window management, chat/dialogue, map/dispatch, game
  state machine, audio, persistence — separate files/modules, not one blob.
- No external image/audio assets required — map and UI are CSS/SVG, sound is
  synthesized via Web Audio API — so the game runs from a plain file with no
  fetches.

## UI & theme

- Strict black-and-green CRT terminal look across all 4 windows: monospace
  font, green phosphor glow/text-shadow, black backgrounds, subtle scanline
  overlay. Differentiate departments via icons/labels/ASCII touches, not by
  breaking the black-and-green palette.
- Design for clarity: always obvious which window needs attention (ringing/
  flashing), which units are available/en route/on-scene, and how much time
  is left on an active case.
- Support window drag, focus (bring-to-front), minimize (to a taskbar),
  and resize; layout should hold up reasonably at different window/desktop
  sizes.

## Before calling anything done

- **Actually play the game before saying it's ready.** Boot it, run through
  a full shift: answer calls in single- and multi-department cases, make
  different dialogue choices, dispatch correct and incorrect unit types,
  let a timer expire at least once, finish the shift, confirm the grade/
  results screen and leaderboard save/persist correctly.
- Check edge cases: dragging/resizing/minimizing windows mid-call, dispatching
  a unit that's already en route, reloading the page mid-shift vs. between
  shifts, high scores surviving a reload.
- Only report the game as finished after it has actually been exercised this
  way — don't claim success based on the code merely loading.

## Definition of done

Ready to hand off when: a full scripted shift can be played start to finish
across all 4 windows, branching dialogue meaningfully affects outcomes, the
map/chat location-reveal mechanic works, high scores persist locally across
sessions, the black-and-green CRT theme is consistent everywhere, and it's
been manually played through at least once without issues.
