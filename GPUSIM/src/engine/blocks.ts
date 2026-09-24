import type { BlockInfo } from "./types";

/** Partition `numThreads` global thread indices into blocks of `threadsPerBlock`. */
export function partitionIntoBlocks(
  numThreads: number,
  threadsPerBlock: number,
): BlockInfo[] {
  const size = Math.max(1, Math.min(threadsPerBlock, numThreads));
  const blocks: BlockInfo[] = [];
  for (let start = 0, blockIndex = 0; start < numThreads; start += size, blockIndex++) {
    const end = Math.min(start + size, numThreads);
    const threadIndices: number[] = [];
    for (let t = start; t < end; t++) threadIndices.push(t);
    blocks.push({ blockIndex, threadIndices });
  }
  return blocks;
}
