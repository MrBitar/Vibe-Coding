import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  accent?: "pink" | "cyan";
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  accent = "pink",
  action,
}: SectionHeadingProps) {
  const neonClass = accent === "pink" ? "neon-text-pink" : "neon-text-cyan";
  const barClass =
    accent === "pink"
      ? "bg-gradient-to-r from-neon-pink to-neon-purple"
      : "bg-gradient-to-r from-neon-cyan to-neon-purple";

  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-display text-[0.6rem] tracking-[0.3em] text-neon-yellow">
          {eyebrow}
        </p>
        <h2 className={`font-display text-xl sm:text-2xl ${neonClass}`}>
          {title}
        </h2>
        <div className={`mt-3 h-1 w-24 ${barClass}`} />
      </div>
      {action}
    </div>
  );
}
