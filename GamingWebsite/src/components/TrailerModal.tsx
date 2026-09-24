import type { UpcomingGame } from "../types";

interface TrailerModalProps {
  game: UpcomingGame;
  onClose: () => void;
}

export function TrailerModal({ game, onClose }: TrailerModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="retro-panel neon-border-cyan w-full max-w-2xl bg-bg-dark p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm neon-text-cyan">
            {game.title} — TRAILER
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[0.6rem] text-white/70 hover:text-neon-pink"
          >
            [ CLOSE ]
          </button>
        </div>
        <div
          className="relative flex aspect-video items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${game.art[0]} 0%, ${game.art[1]} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30 animate-flicker"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.6) 4px)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-2xl text-white">
              ▶
            </div>
            <p className="font-display text-[0.6rem] text-white">
              PREVIEW MODE
            </p>
            <p className="max-w-xs text-base text-white/80">
              Trailer playback is mocked in this prototype build — swap in a
              real embed once a source is wired up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
