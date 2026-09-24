import { useEffect, useState } from "react";

interface ArrayEditorProps {
  label: string;
  values: number[];
  onApply: (values: number[]) => void;
}

export function ArrayEditor({ label, values, onApply }: ArrayEditorProps) {
  const [text, setText] = useState(values.join(", "));

  // Keep the text field in sync when values change from elsewhere
  // (randomize, thread count change) rather than from this editor.
  useEffect(() => {
    setText(values.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join(",")]);

  function apply() {
    const parsed = text
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (parsed.length === values.length) {
      onApply(parsed);
    } else {
      setText(values.join(", "));
    }
  }

  return (
    <label className="array-editor">
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}
