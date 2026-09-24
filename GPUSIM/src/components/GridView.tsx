import type { BlockInfo, Step } from "../engine/types";

interface GridViewProps {
  blocks: BlockInfo[];
  currentStep: Step | null;
  touchedThreads: Set<number>;
}

type ThreadState = "idle" | "active" | "done";

function stateFor(
  thread: number,
  currentStep: Step | null,
  touchedThreads: Set<number>,
): ThreadState {
  if (currentStep && currentStep.activeThreads.includes(thread)) return "active";
  if (touchedThreads.has(thread)) return "done";
  return "idle";
}

export function GridView({ blocks, currentStep, touchedThreads }: GridViewProps) {
  return (
    <div className="grid-view">
      <div className="grid-view-header">
        <span>Grid</span>
        <span className="grid-view-subtitle">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="blocks">
        {blocks.map((block) => (
          <div className="block" key={block.blockIndex}>
            <div className="block-label">Block {block.blockIndex}</div>
            <div className="threads">
              {block.threadIndices.map((t) => {
                const state = stateFor(t, currentStep, touchedThreads);
                return (
                  <div className={`thread thread-${state}`} key={t} title={`Thread ${t}`}>
                    {t}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="legend-item">
          <span className="thread thread-idle legend-swatch" /> idle
        </span>
        <span className="legend-item">
          <span className="thread thread-active legend-swatch" /> active this step
        </span>
        <span className="legend-item">
          <span className="thread thread-done legend-swatch" /> done / waiting
        </span>
      </div>
    </div>
  );
}
