import type {
  FeedPost,
  Genre,
  NewsItem,
  SteamPopularGame,
  SteamSaleGame,
  TopGame,
  UpcomingGame,
} from "../types";

export const GENRES: Genre[] = [
  "Action",
  "RPG",
  "Shooter",
  "Strategy",
  "Adventure",
  "Indie",
  "Sports",
  "Simulation",
];

export const NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "New expansion teased for open-world RPG saga",
    summary:
      "The studio confirmed a story-driven expansion is in development, promising a new region and companion system.",
    source: "IGN",
    sourceUrl: "https://www.ign.com",
    art: ["#ff2ec4", "#7c3aed"],
    publishedAt: "2026-07-14",
    genre: "RPG",
  },
  {
    id: "n2",
    title: "Tactical shooter esports circuit announces season finals",
    summary:
      "Sixteen teams will compete for the championship title next month in a live arena event.",
    source: "Polygon",
    sourceUrl: "https://www.polygon.com",
    art: ["#2fe6ff", "#3d0f52"],
    publishedAt: "2026-07-13",
    genre: "Shooter",
  },
  {
    id: "n3",
    title: "Beloved indie roguelike gets surprise free content update",
    summary:
      "A new biome, boss, and difficulty mode landed overnight with no prior announcement.",
    source: "Kotaku",
    sourceUrl: "https://kotaku.com",
    art: ["#ffd93d", "#ff7a2f"],
    publishedAt: "2026-07-12",
    genre: "Indie",
  },
  {
    id: "n4",
    title: "Grand strategy sequel delayed to early next year",
    summary:
      "Developers cited the need for more polish on the diplomacy and economy systems.",
    source: "PC Gamer",
    sourceUrl: "https://www.pcgamer.com",
    art: ["#b967ff", "#1c0f33"],
    publishedAt: "2026-07-11",
    genre: "Strategy",
  },
  {
    id: "n5",
    title: "Arcade-style racer announces cross-platform play",
    summary:
      "Players on all platforms will be able to race together starting with the next patch.",
    source: "GameSpot",
    sourceUrl: "https://www.gamespot.com",
    art: ["#ff4fd8", "#2fe6ff"],
    publishedAt: "2026-07-10",
    genre: "Sports",
  },
  {
    id: "n6",
    title: "Survival simulation title hits one million players",
    summary:
      "The slow-burn colony sim has quietly become one of the year's biggest indie hits.",
    source: "Eurogamer",
    sourceUrl: "https://www.eurogamer.net",
    art: ["#ff7a2f", "#ff2ec4"],
    publishedAt: "2026-07-09",
    genre: "Simulation",
  },
];

export const UPCOMING_GAMES: UpcomingGame[] = [
  {
    id: "u1",
    title: "Chrono Drift",
    releaseDate: "2026-09-18",
    genre: "Action",
    platforms: ["PC", "PS5", "Xbox Series X|S"],
    art: ["#ff2ec4", "#2fe6ff"],
    hasTrailer: true,
    synopsis:
      "A time-bending action game where every dash rewinds the world around you.",
  },
  {
    id: "u2",
    title: "Nightfall Keep",
    releaseDate: "2026-10-02",
    genre: "RPG",
    platforms: ["PC", "PS5"],
    art: ["#b967ff", "#ff4fd8"],
    hasTrailer: true,
    synopsis:
      "A gothic open-world RPG about reclaiming a cursed kingdom one companion at a time.",
  },
  {
    id: "u3",
    title: "Vector Siege",
    releaseDate: "2026-08-21",
    genre: "Strategy",
    platforms: ["PC"],
    art: ["#2fe6ff", "#1c0f33"],
    hasTrailer: false,
    synopsis:
      "Neon-lit real-time strategy with fully destructible vector battlefields.",
  },
  {
    id: "u4",
    title: "Skyline Runner 2",
    releaseDate: "2026-11-05",
    genre: "Sports",
    platforms: ["PC", "Xbox Series X|S", "Switch 2"],
    art: ["#ffd93d", "#ff2ec4"],
    hasTrailer: true,
    synopsis:
      "High-speed rooftop racing returns with a full track editor and night mode.",
  },
  {
    id: "u5",
    title: "Static Hollow",
    releaseDate: "2026-08-30",
    genre: "Adventure",
    platforms: ["PC", "PS5"],
    art: ["#ff7a2f", "#b967ff"],
    hasTrailer: false,
    synopsis:
      "A VHS-flavored horror adventure told across three haunted broadcast tapes.",
  },
];

export const STEAM_POPULAR: SteamPopularGame[] = [
  {
    id: "p1",
    title: "Neon Front Assault",
    genre: "Shooter",
    currentPlayers: 812_340,
    art: ["#ff2ec4", "#3d0f52"],
  },
  {
    id: "p2",
    title: "Ember & Ash",
    genre: "RPG",
    currentPlayers: 654_120,
    art: ["#ff7a2f", "#7c3aed"],
  },
  {
    id: "p3",
    title: "Gridlock Arena",
    genre: "Action",
    currentPlayers: 498_760,
    art: ["#2fe6ff", "#ff2ec4"],
  },
  {
    id: "p4",
    title: "Colony Horizon",
    genre: "Simulation",
    currentPlayers: 322_910,
    art: ["#ffd93d", "#1c0f33"],
  },
  {
    id: "p5",
    title: "Iron Vanguard",
    genre: "Strategy",
    currentPlayers: 281_450,
    art: ["#b967ff", "#2fe6ff"],
  },
  {
    id: "p6",
    title: "Rustbelt Rally",
    genre: "Sports",
    currentPlayers: 190_330,
    art: ["#ff4fd8", "#ffd93d"],
  },
];

export const STEAM_SALES: SteamSaleGame[] = [
  {
    id: "s1",
    title: "Voidwalker Chronicles",
    genre: "RPG",
    discountPercent: 60,
    originalPrice: 49.99,
    salePrice: 19.99,
    endsInDays: 3,
    art: ["#7c3aed", "#ff2ec4"],
  },
  {
    id: "s2",
    title: "Pixel Garrison",
    genre: "Strategy",
    discountPercent: 40,
    originalPrice: 24.99,
    salePrice: 14.99,
    endsInDays: 5,
    art: ["#2fe6ff", "#ffd93d"],
  },
  {
    id: "s3",
    title: "Turbo Outrun",
    genre: "Sports",
    discountPercent: 75,
    originalPrice: 29.99,
    salePrice: 7.49,
    endsInDays: 1,
    art: ["#ff7a2f", "#ff2ec4"],
  },
  {
    id: "s4",
    title: "Hollow Static",
    genre: "Adventure",
    discountPercent: 30,
    originalPrice: 19.99,
    salePrice: 13.99,
    endsInDays: 6,
    art: ["#b967ff", "#3d0f52"],
  },
  {
    id: "s5",
    title: "Fracture Point",
    genre: "Shooter",
    discountPercent: 50,
    originalPrice: 39.99,
    salePrice: 19.99,
    endsInDays: 2,
    art: ["#ff2ec4", "#2fe6ff"],
  },
  {
    id: "s6",
    title: "Meadowlight Farms",
    genre: "Simulation",
    discountPercent: 20,
    originalPrice: 17.99,
    salePrice: 14.39,
    endsInDays: 4,
    art: ["#ffd93d", "#ff7a2f"],
  },
];

export const TOP_GAMES: TopGame[] = [
  {
    id: "t1",
    rank: 1,
    title: "Neon Front Assault",
    genre: "Shooter",
    platform: "PC / PS5 / Xbox",
    art: ["#ff2ec4", "#3d0f52"],
  },
  {
    id: "t2",
    rank: 2,
    title: "Ember & Ash",
    genre: "RPG",
    platform: "PC / PS5",
    art: ["#ff7a2f", "#7c3aed"],
  },
  {
    id: "t3",
    rank: 3,
    title: "Chrono Drift",
    genre: "Action",
    platform: "PC / PS5 / Xbox",
    art: ["#ff2ec4", "#2fe6ff"],
  },
  {
    id: "t4",
    rank: 4,
    title: "Gridlock Arena",
    genre: "Action",
    platform: "PC",
    art: ["#2fe6ff", "#ff2ec4"],
  },
  {
    id: "t5",
    rank: 5,
    title: "Iron Vanguard",
    genre: "Strategy",
    platform: "PC / Switch 2",
    art: ["#b967ff", "#2fe6ff"],
  },
];

export const INITIAL_FEED_POSTS: FeedPost[] = [
  {
    id: "f1",
    username: "SynthRider88",
    gameTitle: "Chrono Drift",
    content:
      "That rewind mechanic in the Chrono Drift trailer looks like it could break speedrunning wide open. Day one for me.",
    postedAt: "2026-07-15T18:20:00Z",
    likes: 24,
  },
  {
    id: "f2",
    username: "PixelHoarder",
    gameTitle: "Ember & Ash",
    content:
      "120 hours in and I'm still finding new companion dialogue. This might be my RPG of the year already.",
    postedAt: "2026-07-15T14:05:00Z",
    likes: 41,
  },
  {
    id: "f3",
    username: "GridRunnerX",
    gameTitle: "Vector Siege",
    content:
      "Anyone else worried the destructible terrain in Vector Siege is going to tank performance on release? Hope they optimize before launch.",
    postedAt: "2026-07-14T09:40:00Z",
    likes: 12,
  },
];
