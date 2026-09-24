import { EmptyState } from "../components/EmptyState";
import { NewsCard } from "../components/NewsCard";
import { SectionHeading } from "../components/SectionHeading";
import type { NewsItem } from "../types";

export function NewsSection({ items }: { items: NewsItem[] }) {
  return (
    <section id="news" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="BREAKING" title="Latest Gaming News" />
      {items.length === 0 ? (
        <EmptyState label="news stories" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
