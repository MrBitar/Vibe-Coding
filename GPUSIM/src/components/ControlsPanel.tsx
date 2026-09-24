import type { SimulationApi } from "../hooks/useSimulation";
import type { OperationId } from "../engine/types";
import { ArrayEditor } from "./ArrayEditor";

const OPERATIONS: { id: OperationId; label: string }[] = [
  { id: "add", label: "Vector add: C[i] = A[i] + B[i]" },
  { id: "multiply", label: "Vector multiply: C[i] = A[i] * B[i]" },
  { id: "dot", label: "Dot product: sum(A[i] * B[i])" },
];

export function ControlsPanel(sim: SimulationApi) {
  const atEnd = sim.stepIndex >= sim.totalSteps;

  return (
    <div className="controls-panel">
      <div className="control-group">
        <label className="field-label" htmlFor="num-threads">
          Threads: {sim.numThreads}
        </label>
        <input
          id="num-threads"
          type="range"
          min={1}
          max={64}
          value={sim.numThreads}
          onChange={(e) => sim.changeNumThreads(Number(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label className="field-label" htmlFor="threads-per-block">
          Threads per block: {sim.threadsPerBlock}
        </label>
        <input
          id="threads-per-block"
          type="range"
          min={1}
          max={sim.numThreads}
          value={sim.threadsPerBlock}
          onChange={(e) => sim.changeThreadsPerBlock(Number(e.target.value))}
        />
      </div>

      <div className="control-group">
        <span className="field-label">Operation</span>
        <div className="operation-options">
          {OPERATIONS.map((op) => (
            <label key={op.id} className="operation-option">
              <input
                type="radio"
                name="operation"
                checked={sim.operation === op.id}
                onChange={() => sim.setOperation(op.id)}
              />
              {op.label}
            </label>
          ))}
        </div>
      </div>

      <div className="control-group">
        <ArrayEditor label="Array A" values={sim.inputA} onApply={sim.updateInputA} />
        <ArrayEditor label="Array B" values={sim.inputB} onApply={sim.updateInputB} />
        <button type="button" className="secondary-button" onClick={sim.randomizeData}>
          Randomize data
        </button>
      </div>

      <div className="control-group">
        <label className="field-label" htmlFor="speed">
          Playback speed: {sim.speedMs} ms/step
        </label>
        <input
          id="speed"
          type="range"
          min={150}
          max={2000}
          step={50}
          value={sim.speedMs}
          onChange={(e) => sim.setSpeedMs(Number(e.target.value))}
        />
      </div>

      <div className="control-group playback-buttons">
        <button type="button" onClick={sim.reset} className="secondary-button">
          Reset
        </button>
        <button type="button" onClick={sim.stepForward} disabled={atEnd || sim.playing}>
          Step
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={sim.playing ? sim.pause : sim.play}
          disabled={atEnd && !sim.playing}
        >
          {sim.playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
