import { useState } from "react";
import { ArtFrame } from "../components/ArtFrame";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import { TrailerModal } from "../components/TrailerModal";
import type { UpcomingGame } from "../types";

export function UpcomingGamesSection({ items }: { items: UpcomingGame[] }) {
  const [trailerGame, setTrailerGame] = useState<UpcomingGame | null>(null);

  return (
    <section
      id="upcoming"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
    >
      <SectionHeading
        eyebrow="ON THE HORIZON"
        title="Upcoming Games"
        accent="cyan"
      />
      {items.length === 0 ? (
        <EmptyState label="upcoming games" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((game) => {
            const releaseDate = new Date(game.releaseDate).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric", year: "numeric" },
            );
            return (
              <article
                key={game.id}
                className="retro-panel flex h-full flex-col overflow-hidden"
              >
                <ArtFrame
                  art={game.art}
                  title={game.genre}
                  badge={
                    <span className="font-display text-[0.5rem] bg-black/60 px-2 py-1 text-neon-yellow">
                      {releaseDate}
                    </span>
                  }
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-xl leading-snug text-white">
                    {game.title}
                  </h3>
                  <p className="flex-1 text-base text-white/70">
                    {game.synopsis}
                  </p>
                  <p className="text-sm text-white/50">
                    {game.platforms.join(" · ")}
                  </p>
                  {game.hasTrailer && (
                    <button
                      type="button"
                      onClick={() => setTrailerGame(game)}
                      className="btn-retro-cyan mt-2 w-fit"
                    >
                      ▶ WATCH TRAILER
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {trailerGame && (
        <TrailerModal game={trailerGame} onClose={() => setTrailerGame(null)} />
      )}
    </section>
  );
}
