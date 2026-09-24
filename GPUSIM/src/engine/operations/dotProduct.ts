import type { BlockInfo, Step } from "../types";

/**
 * Dot product is the one operation here that isn't purely element-wise:
 * threads first compute independent partial products, then must cooperate
 * to combine those partials into a single sum. That combination is modeled
 * the way real GPU reductions work:
 *
 *   1. compute  — every thread writes partial[i] = A[i] * B[i]
 *   2. reduce   — within each block, a tree reduction halves the number of
 *                 active threads every round (thread `li` adds the partial
 *                 at `li + stride` into its own), until each block holds a
 *                 single per-block sum at its first thread.
 *   3. combine  — the per-block sums are added together into the final
 *                 scalar result (this is the step that only matters when
 *                 there is more than one block).
 */
export function generateDotProductSteps(
  inputA: number[],
  inputB: number[],
  numThreads: number,
  blocks: BlockInfo[],
): Step[] {
  const steps: Step[] = [];

  // Phase 1: compute partial products, one per thread, all in lockstep.
  const computeActive: number[] = [];
  const computeReads: Step["reads"] = [];
  const computeWrites: Step["writes"] = [];
  for (let i = 0; i < numThreads; i++) {
    computeActive.push(i);
    computeReads.push({ thread: i, buffer: "A", index: i });
    computeReads.push({ thread: i, buffer: "B", index: i });
    computeWrites.push({
      thread: i,
      buffer: "partial",
      index: i,
      value: inputA[i] * inputB[i],
    });
  }
  steps.push({
    phase: "compute",
    label: `All ${numThreads} threads compute their partial product in parallel: partial[i] = A[i] * B[i]`,
    activeThreads: computeActive,
    reads: computeReads,
    writes: computeWrites,
  });

  // Running copy of the `partial` buffer so we can compute concrete write
  // values at generation time (the whole simulation is deterministic).
  const partialState = inputA.slice(0, numThreads).map((a, i) => a * inputB[i]);

  // Phase 2: tree reduction, independently within each block, one round at
  // a time. All blocks execute the same round simultaneously.
  const maxBlockSize = Math.max(...blocks.map((b) => b.threadIndices.length));

  for (let stride = 1; stride < maxBlockSize; stride *= 2) {
    const active: number[] = [];
    const reads: Step["reads"] = [];
    const writes: Step["writes"] = [];

    for (const block of blocks) {
      const len = block.threadIndices.length;
      if (stride >= len) continue;
      for (let li = 0; li + stride < len; li += stride * 2) {
        const selfIdx = block.threadIndices[li];
        const otherIdx = block.threadIndices[li + stride];
        const sum = partialState[selfIdx] + partialState[otherIdx];
        active.push(selfIdx);
        reads.push({ thread: selfIdx, buffer: "partial", index: selfIdx });
        reads.push({ thread: selfIdx, buffer: "partial", index: otherIdx });
        writes.push({ thread: selfIdx, buffer: "partial", index: selfIdx, value: sum });
      }
    }

    if (active.length === 0) continue;

    // Apply this round's results before generating the next round, since
    // later rounds read the updated partials.
    for (const w of writes) partialState[w.index] = w.value;

    steps.push({
      phase: "reduce",
      label: `Reduction round (stride ${stride}): each active thread adds partial[i + ${stride}] into partial[i], within its own block`,
      activeThreads: active,
      reads,
      writes,
    });
  }

  // Phase 3: combine each block's single remaining sum into the final
  // scalar result. Always emitted, even for one block, so there's always
  // an explicit "this is the answer" moment.
  const leaders = blocks.map((b) => b.threadIndices[0]);
  const finalSum = leaders.reduce((acc, idx) => acc + partialState[idx], 0);
  steps.push({
    phase: "combine",
    label:
      leaders.length > 1
        ? `Thread 0 combines the ${leaders.length} per-block sums into the final result`
        : `Final block sum becomes the dot product result`,
    activeThreads: [0],
    reads: leaders.map((idx) => ({ thread: 0, buffer: "partial", index: idx })),
    writes: [{ thread: 0, buffer: "result", index: 0, value: finalSum }],
  });

  return steps;
}
