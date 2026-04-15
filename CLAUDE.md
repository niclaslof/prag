# CLAUDE.md

Guidance for AI assistants (Claude Code and similar) working in this repository.

## Project overview

**Prag** (Prague Explorer) is a small interactive web app for discovering Prague's best restaurants, bars, cafés, clubs and sights. It renders a filterable Google Map, a detail panel per place, favorites/itinerary support, and static per-place detail pages. Data is curated by hand in TypeScript files and optionally enriched by a Python pipeline that hits Google Places API (New) and generates short Anthropic-written blurbs.

Deployed to Vercel. Production build is a mix of a single client-heavy landing page (the map) and statically generated `/place/[category]/[id]` detail pages.

## Critical: Next.js version

This project runs **Next.js 16.2.2** with **React 19.2.4** (see `package.json`). Per `AGENTS.md`:

> This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Before adding routes, modifying config, or using a Next.js API you are not 100% sure about in this version, **read the docs bundled in `node_modules/next/dist/docs/`** rather than relying on memory of older versions. In particular, dynamic route `params` in this version are `Promise`-wrapped — see `src/app/place/[category]/[id]/page.tsx` for the correct `params: Promise<{...}>` + `await params` pattern.

## Tech stack

- **Framework:** Next.js 16.2.2 (App Router), React 19.2.4, TypeScript 5 (strict)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss` + `@theme inline` block in `src/app/globals.css` (no `tailwind.config` file)
- **Maps:** `@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`
- **Analytics:** `@vercel/analytics`
- **Fonts:** `next/font/google` — Inter (sans) and Playfair Display (serif)
- **Lint:** `eslint` 9 with `eslint-config-next` (flat config in `eslint.config.mjs`)
- **Data pipeline (Python 3.11+):** `requests`, `python-dotenv`, `anthropic`, `openai`, `Pillow` — declared in `pyproject.toml`, installed into `.venv/`

## Repository layout

```
.
├── Makefile                      # Top-level workflows (setup, dev, pipeline, deploy)
├── pyproject.toml                # Python deps for scripts/
├── package.json                  # Node deps + scripts (dev/build/start/lint)
├── next.config.ts                # Next config (image formats, package import opts)
├── eslint.config.mjs             # Flat ESLint config
├── tsconfig.json                 # Strict TS, @/* → ./src/*
├── AGENTS.md                     # Short agent instructions — READ FIRST
├── public/                       # Static assets (icons, manifest, PDF map)
├── scripts/                      # Python data pipeline
│   ├── fetch_places.py           # Google Places API (New) searchText → *.generated.ts
│   └── generate_descriptions.py  # Anthropic-written 40-70 word blurbs
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout, metadata, fonts, Analytics
    │   ├── page.tsx              # Main map page (client component, all filter state)
    │   ├── globals.css           # Tailwind v4 theme + dark-mode overrides
    │   └── place/[category]/[id]/page.tsx  # Static per-place detail page
    ├── components/               # All client components ("use client")
    │   ├── Header.tsx
    │   ├── SearchBar.tsx         # Query, category/price/district/rating filters
    │   ├── Map.tsx               # Google Map + custom SVG pie-chart clusters
    │   ├── PlacePanel.tsx        # Slide-in detail panel
    │   ├── PlaceList.tsx         # Bottom-sheet list view
    │   └── RoutePlanner.tsx      # Itinerary builder for favorites
    ├── data/
    │   ├── places.ts             # Aggregates all categories into allPlaces
    │   └── categories/           # Curated seed data — one file per category
    │       ├── restaurants.ts
    │       ├── bars.ts
    │       ├── sights.ts
    │       ├── cafes.ts
    │       └── clubs.ts
    └── lib/
        ├── types.ts              # Place, Category, District, CATEGORIES, PRICE_SYMBOLS…
        ├── useFavorites.ts       # localStorage-backed "prag-favorites"
        ├── useDarkMode.ts        # localStorage "prag-dark" + html.dark class
        └── useGeolocation.ts     # getCurrentPosition wrapper + haversine helper
```

## Data model

The domain type is `Place` in `src/lib/types.ts`. Key facts:

- Five categories: `restaurant | bar | sight | cafe | club` (`Category` type)
- Places are keyed by `(category, id)` — the ID is only unique *within* a category. All code that tracks places by key uses `` `${category}-${id}` `` (see favorites, place detail route).
- `CATEGORIES` record holds display metadata (name, emoji, colors) — use it instead of hardcoding.
- `DISTRICTS` is a const tuple of the 13 Prague districts + "Other". Filters rely on exact string match against `place.district`.
- `PriceLevel` is `0 | 1 | 2 | 3 | 4`; `PRICE_SYMBOLS` maps to `Free | $ | $$ | $$$ | $$$$`.
- `OpeningHours.day` is 0=Sunday … 6=Saturday. `open`/`close` are `"HH:MM"` strings, or the special values `"closed"` / `"24h"`. `isOpenNow` in `src/app/page.tsx` handles midnight-spanning ranges.
- Curated seed IDs start at 1 per category. The Python fetcher uses ID offsets (`restaurant: 1000, bar: 2000, sight: 3000, cafe: 4000, club: 5000`) for `*.generated.ts` files so they never collide with hand-written rows.

`src/data/places.ts` simply spreads all five category arrays into `allPlaces`. If you add a new category, you must update `places.ts`, `Category` in `types.ts`, `CATEGORIES`, `CATEGORY_FILTERS`, and the Python `QUERIES`/`id_offsets` maps.

## Development workflows

Use the Makefile as the entry point — it captures the intended flow.

```bash
make setup          # Create .venv, install Python + Node deps
make setup-node     # npm install only
make setup-python   # venv + editable install of scripts package

make dev            # next dev on :3000
make build          # next build (production)

make fetch-places   # scripts/fetch_places.py  → *.generated.ts per category
make descriptions   # scripts/generate_descriptions.py → src/data/descriptions.json
make pipeline       # fetch-places + descriptions

make deploy         # git push origin main (Vercel auto-deploys)
make clean          # rm -rf .venv node_modules .next
```

Direct Node scripts: `npm run dev | build | start | lint`.

Note the Makefile uses Windows-style venv paths (`.venv/Scripts/python`). On Linux/macOS you may need to invoke `.venv/bin/python` manually, or just run scripts directly once the venv is active.

### Environment variables (`.env.local`)

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — required at runtime by `Map.tsx`; also read by `fetch_places.py`
- `GOOGLE_PLACES_API_KEY` — optional alternate name accepted by `fetch_places.py`
- `ANTHROPIC_API_KEY` — required by `generate_descriptions.py`

The `.env*` files are gitignored. The Python scripts load `.env.local` via `python-dotenv`.

### Python data pipeline details

- `fetch_places.py` hits `https://places.googleapis.com/v1/places:searchText` (Places API **New**, v1), biased to a 6 km circle around Prague center (`50.0875, 14.4213`). It writes raw JSON to `scripts/places_raw.json` (gitignored under `scripts/geocoded_results.json` — note the mismatch; if you add new output files check `.gitignore`) and TS files to `src/data/categories/<category>s.generated.ts`.
- Generated files are **not** auto-imported. To use them, edit `src/data/places.ts` to also spread e.g. `restaurantsGenerated`.
- `generate_descriptions.py` parses curated `.ts` files with a regex (skips `*.generated.ts`), calls Claude (model `claude-sonnet-4-6` — keep this current with the latest Sonnet when updating) with a strict 40-70 word, opinionated-travel-writer system prompt, and writes `src/data/descriptions.json`. It is **incremental**: existing keys are not regenerated.

## Conventions

- **Client vs server components.** The main page (`src/app/page.tsx`) is client-side because all filter/selection state lives there. The per-place detail route (`src/app/place/[category]/[id]/page.tsx`) is a server component that uses `generateStaticParams` + `generateMetadata` — keep it server-only so it pre-renders at build time.
- **Path alias:** `@/*` → `./src/*` (see `tsconfig.json`). Always import via `@/components/...`, `@/lib/types`, `@/data/places`.
- **Styling.** Tailwind v4 custom palette lives in `globals.css` under `@theme inline`: `ink`, `paper`, `accent`, `accent-light`, `warm`, `panel`, `tag-bg`, `tag-text`, `new-bg`, `new-text`. Dark mode is toggled by adding `class="dark"` on `<html>` from `useDarkMode`; overrides are hand-rolled per class in `globals.css` (there is no Tailwind `darkVariant` config). Prefer adding a dark override in `globals.css` when introducing new surface colors.
- **Fonts.** Reference via CSS variables: `font-[family-name:var(--font-playfair)]` for headlines, default Inter otherwise.
- **Favorites.** Always identify by `(category, id)` — `useFavorites` stores `` `${category}-${id}` `` strings under `localStorage["prag-favorites"]`. Never use `id` alone.
- **Map markers.** `Map.tsx` uses raw `google.maps.Marker` via a ref (not React children). The clusterer renders an SVG pie chart whose slice colors come from `CATEGORIES[place.category].color`. When adding marker styles, update both the create path and the "highlight selected" effect — they set `icon` independently.
- **No test suite** currently exists. Validate UI changes by running `make dev` and `npm run lint` + `npm run build` before shipping. Call out explicitly when a change can't be tested interactively.
- **Python style.** `ruff` with `line-length = 100`, `target-version = "py311"`.

## Adding a new place (curated)

1. Pick the category file under `src/data/categories/`.
2. Append a `Place` object. Required: `id` (next integer in that file), `category`, `name`, `tagline`, `tags` (comma-separated string, not array), `address`, `district` (must be one of `DISTRICTS`), `lat`, `lng`. Optional: `priceLevel`, `priceRange`, `rating`, `userRatingsTotal`, `website`, `phone`, `hours`, `photoUrl`, `description`, `aiDescription`, `isTopPick`, `isNew`.
3. That's it — `allPlaces` in `src/data/places.ts` picks it up automatically, and `generateStaticParams` will emit a detail page at `/place/<category>/<id>` on the next build.

## Deployment

Vercel project auto-deploys from `main`. The `make deploy` target does `git add -A && git commit -m "Update" && git push origin main`. Prefer real commit messages over the generic `"Update"` when pushing manually.
