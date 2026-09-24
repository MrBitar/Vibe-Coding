# Radar — Live Aircraft Tracker

A web app that shows a live feed of aircraft flying overhead, styled like a 1990s air-traffic-control radar scope.

This is a fresh project (empty directory) — there is no existing code, stack, or tooling yet. Treat this file as the spec to build against, not a description of code that already exists.

## Core Features

1. **Live plane feed** — poll a live flight-tracking API on an interval and render current aircraft positions on screen.
2. **Map / geography** — planes are plotted over real map locations (coastlines, borders, or a tile layer), not a blank grid.
3. **Click-to-inspect** — clicking a plane blip opens a details panel showing:
   - Origin airport (departed from)
   - Destination airport
   - Callsign / flight number, altitude, speed, heading (nice-to-have if the data source provides them)
4. **Trajectory line** — clicking a plane draws a line representing its flight path (origin → current position → destination, or the recent track history if origin/destination isn't available from the API).

## Visual Theme — 90s Radar / CRT ATC Scope

- Classic monochrome phosphor palette: black background, green (or amber) glow for blips, sweep line, and text. Avoid modern flat-UI colors.
- Circular radar scope with **range rings** and **degree ticks** around the edge.
- Rotating **sweep line** animation (like a rotating radar beam) sweeping across the scope continuously.
- **Scanline / CRT effect** (subtle scanlines, slight screen curvature or vignette, maybe a soft glow/bloom on bright elements).
- Monospace font for all HUD text (callsigns, coordinates, readouts) — think terminal/military HUD, not a modern sans-serif.
- Blips should have a fading "trail" or blink/pulse effect, not a static modern map pin icon.
- Details panel styled like a retro terminal readout (bordered box, blocky text, maybe green-on-black).

## Data Source

No API integration exists yet. Recommended for live plane data (evaluate before committing):
- **OpenSky Network REST API** — free tier, no key required for low-volume/anonymous use, gives lat/lon/altitude/heading/callsign for aircraft in a bounding box.
- **ADS-B Exchange** — more detail (registration, aircraft type) but typically requires an API key / subscription (RapidAPI).

Origin/destination airport data is generally **not** included in raw ADS-B position feeds — that requires cross-referencing the callsign/flight number against a flight-schedule API (e.g. AeroDataBox, FlightAware, or OpenSky's flight endpoints where available). Confirm data availability before promising exact departure/arrival airports; fall back to showing the recent track trail if schedule data isn't available for a given flight.

## Stack (as implemented)

- Plain HTML/CSS/JS, no build step, no npm dependencies. Entry point: `index.html` / `style.css` / `main.js`.
- **Two synced views**, side by side:
  - **Scope 1 — Radar**: custom Canvas radar scope (`main.js` `drawScope()`) with range rings, degree ticks, and a rotating sweep beam. Lat/lon is projected onto the canvas with a simple equirectangular approximation centered on the configured location. No real coastlines/borders here by design — it's the abstract CRT scope.
  - **Scope 2 — Chart**: a real Leaflet map (CDN, `leaflet@1.9.4`) using CARTO's free `dark_all` tiles, CSS-filtered (hue-rotate/saturate) toward the green phosphor palette, showing actual geography.
  - Clicking a blip on *either* view selects the same aircraft on both (`selectAircraft()` is shared), including the amber trajectory line drawn on both the canvas and as a Leaflet polyline.
- Data source: **OpenSky Network** REST API. Routed through `server.py` (stdlib-only Python proxy) rather than called directly from the browser, because OpenSky's CORS header is locked to its own origin — direct fetches from any other origin are blocked. Run the app with `python server.py [port]` (defaults to 8000), not a plain static file server.
- Origin/destination: best-effort lookup via OpenSky's `/api/flights/aircraft` endpoint (last 6h window for the clicked aircraft's `icao24`), returning ICAO airport codes. This endpoint is sparser than live position data, so it's normal to see "UNKNOWN" for many aircraft — see limitation below.
- Trajectory line: drawn from a client-side position history kept per aircraft (`HISTORY_LENGTH = 40` polls) rather than a server-provided track, since anonymous OpenSky track history is unreliable.
- Location/range: user sets center lat/lon + range (km) + poll interval in the side panel, or uses the "USE MY LOCATION" button (browser geolocation).
- **Target Detail Window**: clicking a blip also opens a floating retro dialog (`#detailWindow`) with the fuller telemetry set OpenSky exposes per aircraft — position, distance from scope center, geometric *and* barometric altitude, speed, track/heading, vertical rate (with climbing/descending/level label), squawk code, position source (ADS-B/ASTERIX/MLAT/FLARM), and last-contact age — in addition to the compact "TARGET DATA" summary already in the side panel. Close via the window's `✕` or "CLEAR TARGET".
  - Gotcha already hit once: this window must keep `z-index` comfortably above Leaflet's internal panes (popups/markers go up to ~700), because `#leafletMap`'s container doesn't establish its own CSS stacking context, so Leaflet's inline pane z-indexes otherwise leak out and paint over normal page content. Current value is `2000` — don't drop it back near Leaflet's range.

## Known Limitations

- Origin/destination lookups return raw ICAO airport codes (e.g. `KJFK`), not friendly names — no airport name/city database is wired in yet.
- OpenSky anonymous access is rate-limited (~400 req/day) and has ~10s data resolution; polling faster than the default 15s, or setting a very large range (which pulls far more aircraft and triggers a route lookup per click), will hit 429s quickly.
- Trajectory before the app was opened isn't available — the trail only grows from the moment an aircraft is first seen in this session.

## Running Locally

```
python server.py        # serves on http://localhost:8000
python server.py 8934   # or a custom port
```
Do not open `index.html` directly as a `file://` URL or via a plain static server — the OpenSky proxy routes (`/proxy/states`, `/proxy/flights`) are only handled by `server.py`.
