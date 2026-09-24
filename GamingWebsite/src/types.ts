export type Genre =
  | "Action"
  | "RPG"
  | "Shooter"
  | "Strategy"
  | "Adventure"
  | "Indie"
  | "Sports"
  | "Simulation";

/** CSS gradient stops used to render stylized cover art placeholders (no external image hosting). */
export type ArtGradient = [string, string];

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  art: ArtGradient;
  publishedAt: string;
  genre: Genre;
}

export interface UpcomingGame {
  id: string;
  title: string;
  releaseDate: string;
  genre: Genre;
  platforms: string[];
  art: ArtGradient;
  hasTrailer: boolean;
  synopsis: string;
}

export interface SteamPopularGame {
  id: string;
  title: string;
  genre: Genre;
  currentPlayers: number;
  art: ArtGradient;
}

export interface SteamSaleGame {
  id: string;
  title: string;
  genre: Genre;
  discountPercent: number;
  originalPrice: number;
  salePrice: number;
  endsInDays: number;
  art: ArtGradient;
}

export interface TopGame {
  id: string;
  rank: number;
  title: string;
  genre: Genre;
  platform: string;
  art: ArtGradient;
}

export interface FeedPost {
  id: string;
  username: string;
  gameTitle: string;
  content: string;
  postedAt: string;
  likes: number;
}
