import { useMemo, useState } from "react";
import { GenreFilter } from "../components/GenreFilter";
import { Hero } from "../components/Hero";
import {
  NEWS,
  STEAM_POPULAR,
  STEAM_SALES,
  TOP_GAMES,
  UPCOMING_GAMES,
} from "../data/mockData";
import { NewsSection } from "../sections/NewsSection";
import { SteamPopularSection } from "../sections/SteamPopularSection";
import { SteamSalesSection } from "../sections/SteamSalesSection";
import { TopGamesSection } from "../sections/TopGamesSection";
import { UpcomingGamesSection } from "../sections/UpcomingGamesSection";
import type { Genre } from "../types";

export function HomePage() {
  const [genre, setGenre] = useState<Genre | "All">("All");

  const news = useMemo(
    () => NEWS.filter((item) => genre === "All" || item.genre === genre),
    [genre],
  );
  const upcoming = useMemo(
    () =>
      UPCOMING_GAMES.filter((item) => genre === "All" || item.genre === genre),
    [genre],
  );
  const popular = useMemo(
    () =>
      STEAM_POPULAR.filter((item) => genre === "All" || item.genre === genre),
    [genre],
  );
  const sales = useMemo(
    () =>
      STEAM_SALES.filter((item) => genre === "All" || item.genre === genre),
    [genre],
  );
  const topGames = useMemo(
    () => TOP_GAMES.filter((item) => genre === "All" || item.genre === genre),
    [genre],
  );

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <p className="mb-3 font-display text-[0.55rem] tracking-[0.25em] text-white/50">
          FILTER EVERYTHING BY GENRE
        </p>
        <GenreFilter active={genre} onChange={setGenre} />
      </div>
      <NewsSection items={news} />
      <UpcomingGamesSection items={upcoming} />
      <SteamPopularSection items={popular} />
      <SteamSalesSection items={sales} />
      <TopGamesSection items={topGames} />
    </>
  );
}
