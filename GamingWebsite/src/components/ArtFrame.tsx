import type { ReactNode } from "react";
import type { ArtGradient } from "../types";

interface ArtFrameProps {
  art: ArtGradient;
  title: string;
  badge?: ReactNode;
  className?: string;
}

/** Stylized cover-art placeholder rendered as a gradient tile with the title etched on top. */
export function ArtFrame({ art, title, badge, className = "" }: ArtFrameProps) {
  return (
    <div
      className={`relative flex h-36 items-end overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${art[0]} 0%, ${art[1]} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.5) 4px)",
        }}
      />
      {badge && <div className="absolute right-2 top-2 z-10">{badge}</div>}
      <p className="relative z-10 w-full truncate bg-black/40 px-3 py-2 font-display text-[0.7rem] leading-tight text-white">
        {title}
      </p>
    </div>
  );
}
