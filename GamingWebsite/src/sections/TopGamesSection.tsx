import { ArtFrame } from "../components/ArtFrame";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import type { TopGame } from "../types";

export function TopGamesSection({ items }: { items: TopGame[] }) {
  return (
    <section id="top-games" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="THE LEADERBOARD" title="Top Games Right Now" />
      {items.length === 0 ? (
        <EmptyState label="top games" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((game) => (
            <article
              key={game.id}
              className="retro-panel flex h-full flex-col overflow-hidden"
            >
              <ArtFrame
                art={game.art}
                title={game.genre}
                badge={
                  <span className="font-display text-[0.6rem] bg-black/60 px-2 py-1 text-neon-pink">
                    #{game.rank}
                  </span>
                }
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-xl leading-snug text-white">
                  {game.title}
                </h3>
                <p className="text-sm text-white/50">{game.platform}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
