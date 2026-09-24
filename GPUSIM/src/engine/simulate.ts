import { partitionIntoBlocks } from "./blocks";
import { generateElementwiseSteps } from "./operations/elementwise";
import { generateDotProductSteps } from "./operations/dotProduct";
import type { SimulationConfig, SimulationResult } from "./types";

export function simulate(config: SimulationConfig): SimulationResult {
  const { numThreads, threadsPerBlock, operation, inputA, inputB } = config;
  const blocks = partitionIntoBlocks(numThreads, threadsPerBlock);

  const a = inputA.slice(0, numThreads);
  const b = inputB.slice(0, numThreads);

  if (operation === "add" || operation === "multiply") {
    return {
      steps: generateElementwiseSteps(operation, a, b, numThreads),
      initialBuffers: { A: a, B: b, C: new Array(numThreads).fill(0) },
      blocks,
    };
  }

  // dot product
  return {
    steps: generateDotProductSteps(a, b, numThreads, blocks),
    initialBuffers: {
      A: a,
      B: b,
      partial: new Array(numThreads).fill(0),
      result: [0],
    },
    blocks,
  };
}

/** Replay the first `count` steps' writes on top of the initial buffers. */
export function buffersAfterSteps(
  result: SimulationResult,
  count: number,
): Record<string, number[]> {
  const buffers: Record<string, number[]> = {};
  for (const [name, values] of Object.entries(result.initialBuffers)) {
    buffers[name] = values.slice();
  }
  for (let i = 0; i < count && i < result.steps.length; i++) {
    for (const write of result.steps[i].writes) {
      buffers[write.buffer][write.index] = write.value;
    }
  }
  return buffers;
}
