import { ArtFrame } from "../components/ArtFrame";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import type { SteamPopularGame } from "../types";

export function SteamPopularSection({
  items,
}: {
  items: SteamPopularGame[];
}) {
  return (
    <section
      id="steam-popular"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
    >
      <SectionHeading eyebrow="RIGHT NOW ON STEAM" title="Most Popular on Steam" />
      {items.length === 0 ? (
        <EmptyState label="popular Steam games" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((game) => (
            <article
              key={game.id}
              className="retro-panel flex h-full flex-col overflow-hidden"
            >
              <ArtFrame art={game.art} title={game.genre} />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-xl leading-snug text-white">
                  {game.title}
                </h3>
                <p className="text-base text-neon-yellow">
                  {game.currentPlayers.toLocaleString()} playing now
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
