import type { Step } from "../engine/types";

interface StepInfoProps {
  step: Step | null;
  stepIndex: number;
  totalSteps: number;
}

const PHASE_LABEL: Record<Step["phase"], string> = {
  compute: "Compute",
  reduce: "Reduce",
  combine: "Combine",
};

export function StepInfo({ step, stepIndex, totalSteps }: StepInfoProps) {
  return (
    <div className="step-info">
      <div className="step-info-top">
        <span className="step-counter">
          Step {stepIndex} / {totalSteps}
        </span>
        {step && <span className={`phase-badge phase-${step.phase}`}>{PHASE_LABEL[step.phase]}</span>}
      </div>
      <p className="step-description">
        {step ? step.label : "Nothing has executed yet — press Step or Play to begin."}
      </p>
    </div>
  );
}
