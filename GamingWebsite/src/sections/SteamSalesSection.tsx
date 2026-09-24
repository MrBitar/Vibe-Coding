import { ArtFrame } from "../components/ArtFrame";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import type { SteamSaleGame } from "../types";

export function SteamSalesSection({ items }: { items: SteamSaleGame[] }) {
  return (
    <section id="steam-sales" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="LIMITED TIME" title="Steam Sales" accent="cyan" />
      {items.length === 0 ? (
        <EmptyState label="sale games" />
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
                  <span className="font-display text-[0.55rem] bg-neon-orange px-2 py-1 text-black">
                    -{game.discountPercent}%
                  </span>
                }
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-xl leading-snug text-white">
                  {game.title}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/40 line-through">
                    ${game.originalPrice.toFixed(2)}
                  </span>
                  <span className="text-xl text-neon-yellow">
                    ${game.salePrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  Ends in {game.endsInDays}{" "}
                  {game.endsInDays === 1 ? "day" : "days"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
