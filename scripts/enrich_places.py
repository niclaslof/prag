"""
Enrich existing curated Prague places with Google Places data + photos.

This script:
1. Parses the hand-curated TypeScript data files in src/data/categories/*.ts
   to pull out (id, name, address, category) for every place.
2. For each place, calls Google Places API v1 `searchText` with
   `<name>, <address>, Prague` and keeps the first result.
3. Fetches the first photo via the `places/<placeId>/photos/<photoName>/media`
   endpoint and writes it to `public/images/places/<id>.jpg` (JPEG, max 1200px
   wide). The PlacePanel already falls back to that path automatically, so no
   code changes are required to show the photos.
4. Writes `src/data/enrichment.generated.ts` – a map of extra fields
   (placeId, longer editorial summary, hours, phone, website, rating updates,
   photo URL) keyed by `<category>:<id>`. `src/data/places.ts` merges these
   on top of the curated seed values at module load time.

Usage:
    # Install deps once
    pip install requests python-dotenv

    # Set your key in .env.local (same file Next.js uses)
    # NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
    # or
    # GOOGLE_PLACES_API_KEY=AIza...

    python scripts/enrich_places.py

    # Flags
    python scripts/enrich_places.py --only restaurant           # one category
    python scripts/enrich_places.py --only sight,bar            # multiple
    python scripts/enrich_places.py --skip-photos               # JSON only
    python scripts/enrich_places.py --force                     # overwrite images
    python scripts/enrich_places.py --max-width 1600            # larger photos

The Places API (New) must be enabled on the Google Cloud project. Photos and
text search are billed separately – roughly $0.032 per photo and $0.032 per
text search at the time of writing. ~70 places × 2 calls ≈ $5 one-off.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
import os

# Windows console sanity
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES_DIR = ROOT / "src" / "data" / "categories"
IMAGES_DIR = ROOT / "public" / "images" / "places"
ENRICHMENT_TS = ROOT / "src" / "data" / "enrichment.generated.ts"
ENRICHMENT_JSON = ROOT / "scripts" / "places_enrichment.json"

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PHOTO_URL_TEMPLATE = "https://places.googleapis.com/v1/{photo_name}/media"

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.websiteUri",
        "places.internationalPhoneNumber",
        "places.nationalPhoneNumber",
        "places.regularOpeningHours",
        "places.editorialSummary",
        "places.generativeSummary",
        "places.photos",
        "places.reviews",
    ]
)

# Files named <category>s.ts -> Category singular
CATEGORY_FILES = {
    "restaurant": "restaurants.ts",
    "bar": "bars.ts",
    "sight": "sights.ts",
    "cafe": "cafes.ts",
    "club": "clubs.ts",
    "spa": "spas.ts",
}


PLACE_REGEX = re.compile(
    r"""\{\s*
        id:\s*(?P<id>\d+),\s*
        (?:placeId:\s*"[^"]*",\s*)?
        category:\s*"(?P<category>[^"]+)",\s*
        name:\s*"(?P<name>(?:[^"\\]|\\.)*)",\s*
        tagline:\s*"(?P<tagline>(?:[^"\\]|\\.)*)",\s*
        tags:\s*"(?P<tags>(?:[^"\\]|\\.)*)",\s*
        address:\s*"(?P<address>(?:[^"\\]|\\.)*)",\s*
        district:\s*"(?P<district>[^"]+)",\s*
    """,
    re.VERBOSE,
)


def parse_places() -> list[dict]:
    """Extract a flat list of {id, category, name, address, district} from the TS seeds."""
    places: list[dict] = []
    for category, filename in CATEGORY_FILES.items():
        path = CATEGORIES_DIR / filename
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for m in PLACE_REGEX.finditer(text):
            places.append(
                {
                    "id": int(m.group("id")),
                    "category": m.group("category"),
                    "name": m.group("name").replace('\\"', '"'),
                    "address": m.group("address").replace('\\"', '"'),
                    "district": m.group("district"),
                }
            )
    return places


def call_text_search(api_key: str, query: str) -> dict | None:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "languageCode": "en",
        "regionCode": "cz",
        "maxResultCount": 1,
        "locationBias": {
            "circle": {
                "center": {"latitude": 50.0875, "longitude": 14.4213},
                "radius": 6000.0,
            }
        },
    }
    try:
        r = requests.post(TEXT_SEARCH_URL, headers=headers, json=body, timeout=15)
    except requests.RequestException as e:
        print(f"   ! network error: {e}")
        return None
    if r.status_code != 200:
        print(f"   ! HTTP {r.status_code}: {r.text[:160]}")
        return None
    data = r.json()
    if not data.get("places"):
        return None
    return data["places"][0]


def download_photo(
    api_key: str, photo_name: str, dest: Path, max_width: int
) -> bool:
    """Download a place photo to disk. Returns True on success."""
    url = PHOTO_URL_TEMPLATE.format(photo_name=photo_name)
    params = {
        "maxWidthPx": max_width,
        "key": api_key,
        "skipHttpRedirect": "false",
    }
    try:
        r = requests.get(url, params=params, timeout=20, stream=True)
    except requests.RequestException as e:
        print(f"   ! photo network error: {e}")
        return False
    if r.status_code != 200:
        print(f"   ! photo HTTP {r.status_code}: {r.text[:160]}")
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as fh:
        for chunk in r.iter_content(8192):
            fh.write(chunk)
    return True


def convert_hours(raw: dict | None) -> list[dict] | None:
    """Translate Places API regularOpeningHours.periods to our schema."""
    if not raw:
        return None
    periods = raw.get("periods") or []
    hours: dict[int, dict] = {}
    for p in periods:
        open_block = p.get("open") or {}
        close_block = p.get("close") or {}
        day = open_block.get("day")
        if day is None:
            continue
        oh = open_block.get("hour", 0)
        om = open_block.get("minute", 0)
        ch = close_block.get("hour", 0)
        cm = close_block.get("minute", 0)
        hours[day] = {
            "day": day,
            "open": f"{oh:02d}:{om:02d}",
            "close": f"{ch:02d}:{cm:02d}",
        }
    if not hours:
        return None
    # Fill missing days as closed so the UI renders a full week.
    return [hours.get(i, {"day": i, "open": "closed", "close": "closed"}) for i in range(7)]


def price_to_num(pl: str | None) -> int | None:
    if not pl:
        return None
    return {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }.get(pl)


def convert_reviews(raw_reviews: list[dict] | None) -> list[dict] | None:
    """Extract up to 5 reviews from the Places API response."""
    if not raw_reviews:
        return None
    reviews: list[dict] = []
    for r in raw_reviews[:5]:
        author = r.get("authorAttribution") or {}
        text_obj = r.get("text") or {}
        text = text_obj.get("text", "") if isinstance(text_obj, dict) else str(text_obj)
        if not text:
            # Also try originalText
            orig = r.get("originalText") or {}
            text = orig.get("text", "") if isinstance(orig, dict) else str(orig)
        if not text:
            continue
        reviews.append({
            "authorName": author.get("displayName", ""),
            "authorPhoto": author.get("photoUri", ""),
            "rating": r.get("rating", 0),
            "text": text,
            "relativeTime": r.get("relativePublishTimeDescription", ""),
        })
    return reviews if reviews else None


def render_ts(enrichment: dict[str, dict]) -> str:
    """Render enrichment.generated.ts as a typed lookup."""
    lines = [
        "// AUTO-GENERATED by scripts/enrich_places.py – do not edit by hand.",
        'import { Place } from "@/lib/types";',
        "",
        "export type PlaceEnrichment = Partial<",
        "  Pick<",
        "    Place,",
        '    | "placeId"',
        '    | "rating"',
        '    | "userRatingsTotal"',
        '    | "priceLevel"',
        '    | "phone"',
        '    | "website"',
        '    | "hours"',
        '    | "aiDescription"',
        '    | "photoUrl"',
        '    | "reviews"',
        "  >",
        ">;",
        "",
        "/** Keyed by `${category}:${id}`. */",
        "export const enrichment: Record<string, PlaceEnrichment> = {",
    ]
    for key in sorted(enrichment.keys()):
        entry = enrichment[key]
        lines.append(f"  {json.dumps(key)}: {{")
        for k, v in entry.items():
            lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)},")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma list: restaurant,bar,sight,cafe,club")
    parser.add_argument("--skip-photos", action="store_true")
    parser.add_argument("--force", action="store_true", help="Re-download existing images")
    parser.add_argument("--max-width", type=int, default=1200)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env.local")
    api_key = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("❌ No API key. Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local")
        return 1

    allowed = None
    if args.only:
        allowed = {c.strip() for c in args.only.split(",") if c.strip()}

    places = parse_places()
    if allowed:
        places = [p for p in places if p["category"] in allowed]

    if not places:
        print("No places parsed – check src/data/categories/*.ts")
        return 1

    print(f"🔍 Enriching {len(places)} place(s) (key …{api_key[-6:]})")
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    enrichment: dict[str, dict] = {}
    raw_dump: dict[str, dict] = {}

    for i, p in enumerate(places, 1):
        key = f"{p['category']}:{p['id']}"
        query = f"{p['name']}, {p['address']}, Prague"
        print(f"[{i:>3}/{len(places)}] {p['category']:<10} {p['name']}")
        if args.dry_run:
            continue

        result = call_text_search(api_key, query)
        if not result:
            print("   ↳ no match")
            continue

        entry: dict = {}
        entry["placeId"] = result.get("id")
        if "rating" in result:
            entry["rating"] = result["rating"]
        if "userRatingCount" in result:
            entry["userRatingsTotal"] = result["userRatingCount"]
        pn = price_to_num(result.get("priceLevel"))
        if pn is not None:
            entry["priceLevel"] = pn
        phone = result.get("internationalPhoneNumber") or result.get("nationalPhoneNumber")
        if phone:
            entry["phone"] = phone
        website = result.get("websiteUri")
        if website:
            entry["website"] = website
        hours = convert_hours(result.get("regularOpeningHours"))
        if hours:
            entry["hours"] = hours
        summary = ""
        gen = result.get("generativeSummary")
        if isinstance(gen, dict):
            overview = gen.get("overview", {})
            if isinstance(overview, dict):
                summary = overview.get("text", "") or ""
        if not summary:
            ed = result.get("editorialSummary")
            if isinstance(ed, dict):
                summary = ed.get("text", "") or ""
        if summary:
            entry["aiDescription"] = summary

        # Reviews
        reviews = convert_reviews(result.get("reviews"))
        if reviews:
            entry["reviews"] = reviews

        # Photo
        photos = result.get("photos") or []
        image_path = IMAGES_DIR / f"{p['id']}.jpg"
        if photos and not args.skip_photos:
            if image_path.exists() and not args.force:
                print(f"   ↳ photo exists, skipping")
            else:
                photo_name = photos[0].get("name")
                if photo_name:
                    ok = download_photo(api_key, photo_name, image_path, args.max_width)
                    if ok:
                        print(f"   ↳ photo saved to {image_path.relative_to(ROOT)}")

        enrichment[key] = entry
        raw_dump[key] = result

        time.sleep(0.15)  # be gentle on the API

    ENRICHMENT_JSON.parent.mkdir(parents=True, exist_ok=True)
    ENRICHMENT_JSON.write_text(
        json.dumps(raw_dump, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"💾 Raw dump → {ENRICHMENT_JSON.relative_to(ROOT)}")

    ENRICHMENT_TS.write_text(render_ts(enrichment), encoding="utf-8")
    print(f"💾 Enrichment map → {ENRICHMENT_TS.relative_to(ROOT)}")
    print(f"✅ Done – {len(enrichment)} places enriched.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
