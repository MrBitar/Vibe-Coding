import type { Step } from "../types";

/**
 * Every thread reads A[i] and B[i] and writes C[i] in a single lockstep
 * "compute" phase — this is the embarrassingly-parallel case: no thread
 * depends on any other thread's result.
 */
export function generateElementwiseSteps(
  op: "add" | "multiply",
  inputA: number[],
  inputB: number[],
  numThreads: number,
): Step[] {
  const label = op === "add" ? "C[i] = A[i] + B[i]" : "C[i] = A[i] * B[i]";
  const activeThreads: number[] = [];
  const reads: Step["reads"] = [];
  const writes: Step["writes"] = [];

  for (let i = 0; i < numThreads; i++) {
    activeThreads.push(i);
    reads.push({ thread: i, buffer: "A", index: i });
    reads.push({ thread: i, buffer: "B", index: i });
    const value = op === "add" ? inputA[i] + inputB[i] : inputA[i] * inputB[i];
    writes.push({ thread: i, buffer: "C", index: i, value });
  }

  return [
    {
      phase: "compute",
      label: `All ${numThreads} threads compute in parallel: ${label}`,
      activeThreads,
      reads,
      writes,
    },
  ];
}
