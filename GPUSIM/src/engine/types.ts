export type OperationId = "add" | "multiply" | "dot";

export type Phase = "compute" | "reduce" | "combine";

export interface BufferRef {
  /** Name of the named buffer, e.g. "A", "B", "C", "partial", "result". */
  buffer: string;
  index: number;
}

export interface ReadRef extends BufferRef {
  thread: number;
}

export interface WriteRef extends BufferRef {
  thread: number;
  value: number;
}

export interface Step {
  phase: Phase;
  /** Human-readable description of what happens in this step. */
  label: string;
  /** Thread indices (global, across all blocks) doing work this step. */
  activeThreads: number[];
  reads: ReadRef[];
  writes: WriteRef[];
}

export interface SimulationConfig {
  numThreads: number;
  threadsPerBlock: number;
  operation: OperationId;
  inputA: number[];
  inputB: number[];
}

export interface BlockInfo {
  blockIndex: number;
  /** Global thread indices belonging to this block, in order. */
  threadIndices: number[];
}

export interface SimulationResult {
  steps: Step[];
  /** Initial contents of every named buffer, before any step runs. */
  initialBuffers: Record<string, number[]>;
  blocks: BlockInfo[];
}
