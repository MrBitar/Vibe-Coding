# GPUSIM — GPU Thread & Block Visualizer

## What this project is

A web app that visualizes how GPUs execute parallel work, so someone can *see*
threads, blocks, and warps operate instead of just reading about them. The
project directory is currently empty — this file is the spec to build from,
not a description of existing code.

The target audience is a learner who understands basic programming but has
never worked with CUDA/GPU-style parallelism. Every design decision should
optimize for "make the mental model click visually," not for simulating real
hardware with full accuracy.

## Core concepts to teach

The app must make these ideas concrete and visible:

1. **Threads** — the smallest unit of execution. Many threads run the same
   instruction on different data (SIMT).
2. **Blocks** — groups of threads that execute together and can cooperate
   (shared memory, sync). The grid is made of blocks; blocks are made of
   threads.
3. **Grid/Block/Thread hierarchy** — grid → blocks → threads, with indices
   (`blockIdx`, `threadIdx`) mapping each thread to a piece of data.
4. **Parallel execution** — many threads doing their slice of the operation
   "at the same time," contrasted with a CPU doing it one element at a time.
5. **Warps (stretch goal)** — threads within a block execute in lockstep
   groups (commonly 32 on real hardware). Not required for v1, but the
   architecture should leave room for it later.

## Required features

- **Web app.** Runs in the browser, no install. Framework choice is open —
  pick something that makes animation and reactive state easy (React is a
  safe default; Svelte is also a strong fit for this kind of visualization).
- **Thread count control.** The user picks how many threads participate.
  Reflect this choice immediately in the visualization (more thread boxes,
  regrouped into blocks).
- **Block configuration.** The user should also be able to choose how many
  threads per block (or number of blocks), so the grid → block → thread
  hierarchy is explicit and adjustable, not just a flat thread count.
- **Choice of operation.** The user picks *which* operation the threads
  perform on the data. At minimum:
  - Element-wise vector add (`c[i] = a[i] + b[i]`)
  - Element-wise vector multiply
  - **Dot product** (`sum(a[i] * b[i])`) — required. This is the one
    operation here that isn't purely element-wise: each thread computes a
    partial product, and then a reduction step combines partial results
    into a single sum. The visualization needs to show that reduction
    step explicitly (e.g., a tree or pairwise-sum animation), since it's
    the part that differs most from the embarrassingly-parallel ops.
  - Leave room to add more operations later (e.g., scalar multiply, max
    reduction) without restructuring the simulation engine.
- **Graphical, step-through visualization.** This is the point of the app.
  For any chosen operation:
  - Show the input data (arrays) laid out visually.
  - Show each thread as a distinct visual unit, grouped into its block.
  - Animate/step through execution: which thread reads which data, what it
    computes, where the result goes.
  - Support at least: play/pause, step-forward one cycle at a time, and
    reset. Stepping is more important than autoplay — the user needs to be
    able to pause and stare at any given moment.
  - For the dot product's reduction phase, visually distinguish "compute
    phase" (per-thread multiply) from "reduce phase" (combining results),
    since conflating them defeats the teaching goal.
  - Make idle vs. active threads visually distinct (e.g., color/opacity),
    so it's obvious which threads are doing work in a given step vs.
    waiting or finished.

## Suggested architecture (adjust as the build evolves)

- **Simulation engine** (framework-agnostic, plain TS/JS): given
  `{ numThreads, threadsPerBlock, operation, inputData }`, produce a
  deterministic sequence of discrete "steps," where each step lists which
  threads are active and what they read/compute/write. Keep this decoupled
  from rendering so operations can be unit-tested without a DOM.
- **Renderer/UI layer**: consumes the step sequence and draws it. Keeping
  the engine and renderer separate means adding a new operation is just
  adding a new step-generator function, not touching animation code.
- **Step model** is the key abstraction — something like:
  ```
  Step {
    phase: "compute" | "reduce",
    activeThreads: number[],
    reads: { thread, source, index }[],
    writes: { thread, target, index, value }[],
  }
  ```
  Design this before writing UI code; every operation (add, multiply, dot
  product) should compile down to a list of these.

## Non-goals for v1

- Real GPU hardware accuracy (actual warp scheduling, memory coalescing,
  occupancy limits, register pressure) — the goal is intuition-building,
  not hardware simulation.
- Running actual compiled CUDA/compute-shader code. Operations are defined
  in the app's own simulation model, not executed on a real GPU.

## Working style notes

- Take an incremental approach: get the thread/block grid rendering static
  first, then wire up one simple operation (vector add) end-to-end through
  the step engine, then add stepping/animation, then add the dot product's
  reduction phase, then add remaining operations and polish.
- Favor clarity of the visualization over feature breadth — if a tradeoff
  arises between "one more operation" and "the existing operations are
  easy to follow," pick the latter.
