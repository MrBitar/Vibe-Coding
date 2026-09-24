import { useEffect, useMemo, useState } from "react";
import { buffersAfterSteps, simulate } from "../engine/simulate";
import type { OperationId, SimulationConfig } from "../engine/types";

function randomInts(n: number, min = 1, max = 9): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

export function useSimulation() {
  const [numThreads, setNumThreads] = useState(8);
  const [threadsPerBlock, setThreadsPerBlockState] = useState(4);
  const [operation, setOperation] = useState<OperationId>("add");
  const [inputA, setInputA] = useState<number[]>(() => randomInts(8));
  const [inputB, setInputB] = useState<number[]>(() => randomInts(8));

  // stepIndex = number of steps that have been executed so far (0 = initial
  // state, nothing has run yet).
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);

  const config: SimulationConfig = useMemo(
    () => ({ numThreads, threadsPerBlock, operation, inputA, inputB }),
    [numThreads, threadsPerBlock, operation, inputA, inputB],
  );

  const result = useMemo(() => simulate(config), [config]);

  // Any change that reshapes the simulation restarts playback from step 0.
  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
  }, [result]);

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= result.steps.length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStepIndex((i) => i + 1), speedMs);
    return () => clearTimeout(id);
  }, [playing, stepIndex, result, speedMs]);

  const buffers = useMemo(() => buffersAfterSteps(result, stepIndex), [result, stepIndex]);
  const currentStep = stepIndex > 0 ? result.steps[stepIndex - 1] : null;

  const touchedThreads = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < stepIndex; i++) {
      for (const t of result.steps[i].activeThreads) set.add(t);
    }
    return set;
  }, [result, stepIndex]);

  function changeNumThreads(n: number) {
    const clamped = Math.max(1, Math.min(64, Math.round(n)));
    setNumThreads(clamped);
    setInputA(randomInts(clamped));
    setInputB(randomInts(clamped));
    setThreadsPerBlockState((tpb) => Math.min(tpb, clamped));
  }

  function changeThreadsPerBlock(n: number) {
    setThreadsPerBlockState(Math.max(1, Math.min(numThreads, Math.round(n))));
  }

  function randomizeData() {
    setInputA(randomInts(numThreads));
    setInputB(randomInts(numThreads));
  }

  function updateInputA(values: number[]) {
    if (values.length === numThreads && values.every((v) => Number.isFinite(v))) {
      setInputA(values);
    }
  }

  function updateInputB(values: number[]) {
    if (values.length === numThreads && values.every((v) => Number.isFinite(v))) {
      setInputB(values);
    }
  }

  return {
    numThreads,
    threadsPerBlock,
    operation,
    inputA,
    inputB,
    result,
    buffers,
    currentStep,
    touchedThreads,
    stepIndex,
    totalSteps: result.steps.length,
    playing,
    speedMs,
    setOperation,
    setSpeedMs,
    changeNumThreads,
    changeThreadsPerBlock,
    randomizeData,
    updateInputA,
    updateInputB,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    stepForward: () => setStepIndex((i) => Math.min(i + 1, result.steps.length)),
    reset: () => {
      setStepIndex(0);
      setPlaying(false);
    },
  };
}

export type SimulationApi = ReturnType<typeof useSimulation>;
