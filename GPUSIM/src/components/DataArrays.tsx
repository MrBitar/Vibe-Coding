import type { Step } from "../engine/types";

interface DataArraysProps {
  buffers: Record<string, number[]>;
  currentStep: Step | null;
}

const BUFFER_LABELS: Record<string, string> = {
  A: "A (input)",
  B: "B (input)",
  C: "C (output)",
  partial: "partial products",
  result: "result",
};

export function DataArrays({ buffers, currentStep }: DataArraysProps) {
  return (
    <div className="data-arrays">
      {Object.entries(buffers).map(([name, values]) => (
        <div className="data-row" key={name}>
          <div className="data-row-label">{BUFFER_LABELS[name] ?? name}</div>
          <div className="data-cells">
            {values.map((value, index) => {
              const isRead = currentStep?.reads.some(
                (r) => r.buffer === name && r.index === index,
              );
              const isWrite = currentStep?.writes.some(
                (w) => w.buffer === name && w.index === index,
              );
              const cls = ["data-cell"];
              if (isWrite) cls.push("data-cell-write");
              else if (isRead) cls.push("data-cell-read");
              return (
                <div className={cls.join(" ")} key={index}>
                  <span className="data-cell-index">{index}</span>
                  <span className="data-cell-value">{Number.isFinite(value) ? value : "–"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
