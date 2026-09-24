# GamingWebsite

A gaming news and community hub. This file is the source of truth for what the site should do — the codebase doesn't exist yet, so use this as the spec when scaffolding and implementing.

## Design

- Easy on the eyes: dark-mode-first UI, comfortable contrast (avoid pure white on pure black), generous spacing, and readable type sizes. Avoid dense/cluttered layouts.

## Core Content Sections

- **Latest gaming news** — each article/snippet shows its source (e.g., IGN, Polygon, Kotaku) next to the headline, linking back to the original.
- **Upcoming games** — list/grid of announced titles with release dates.
- **Most popular on Steam** — current top-played/trending titles pulled from Steam.
- **Steam sales** — games currently discounted on Steam, with sale price and discount %.
- **Genres** — content above (news, upcoming, popular, sales) is filterable/organized by genre rather than dumped into one undifferentiated list.
- **Top games right now** — current best/trending games overall (distinct from "most popular on Steam" — this can span platforms).
- **Trailers** — where available, show the game's trailer alongside its listing (upcoming games especially).

## Accounts & Feed

- No login required to browse any of the above — all core content is public.
- Logging in is only required to post in the **feed**.
- Feed: a community space where logged-in users pick a game and share thoughts about it — including speculation/reactions about upcoming games.

## Data Sources

- Steam data (popularity, sales) should come from Steam's public APIs/storefront data.
- News should be aggregated from external gaming news sites, always preserving/displaying attribution to the original source.
