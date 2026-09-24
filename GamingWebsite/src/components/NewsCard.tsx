import type { NewsItem } from "../types";
import { ArtFrame } from "./ArtFrame";

export function NewsCard({ item }: { item: NewsItem }) {
  const date = new Date(item.publishedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="retro-panel flex h-full flex-col overflow-hidden">
      <ArtFrame
        art={item.art}
        title={item.genre}
        badge={
          <span className="font-display text-[0.5rem] bg-black/60 px-2 py-1 text-neon-yellow">
            {date}
          </span>
        }
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-xl leading-snug text-white">{item.title}</h3>
        <p className="flex-1 text-base text-white/70">{item.summary}</p>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-neon-cyan hover:text-neon-yellow"
        >
          <span className="font-display text-[0.55rem]">SOURCE:</span>
          <span className="underline underline-offset-4">{item.source}</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}
