"""
Fetch Prague places via Google Places API (New) — v1 searchText endpoint.

Writes raw results to scripts/places_raw.json and a TypeScript-ready file
at src/data/categories/<category>.generated.ts which can be imported alongside
the curated seed data.

Usage:
    python scripts/fetch_places.py

Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY) in
.env.local with the Places API (New) enabled on the Google Cloud project.

Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(".env.local")
API_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

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
        "places.primaryType",
        "places.types",
        "places.websiteUri",
        "places.internationalPhoneNumber",
        "places.nationalPhoneNumber",
        "places.regularOpeningHours",
        "places.editorialSummary",
        "places.photos",
    ]
)

# Category -> list of text queries. Biased toward Prague and common tourist
# searches. Each query returns ~20 results.
QUERIES: dict[str, list[str]] = {
    "restaurant": [
        "best restaurants in Prague",
        "best Czech restaurants in Prague",
        "Michelin restaurants Prague",
        "fine dining Prague",
        "best restaurants Staré Město Prague",
        "best restaurants Malá Strana Prague",
        "best restaurants Vinohrady Prague",
        "vegetarian restaurants Prague",
    ],
    "bar": [
        "best cocktail bars in Prague",
        "best craft beer bars Prague",
        "wine bars Prague",
        "rooftop bars Prague",
        "historic beer hall Prague",
    ],
    "sight": [
        "top tourist attractions Prague",
        "historic sights Prague",
        "museums Prague",
        "churches Prague",
        "viewpoints Prague",
    ],
    "cafe": [
        "best cafes in Prague",
        "specialty coffee Prague",
        "historic grand cafe Prague",
    ],
    "club": [
        "best nightclubs in Prague",
        "live music club Prague",
        "electronic music club Prague",
    ],
}

# Prague district bounding circle (city centre, 6 km radius) to bias results.
LOCATION_BIAS = {
    "circle": {
        "center": {"latitude": 50.0875, "longitude": 14.4213},
        "radius": 6000.0,
    }
}

RAW_OUT = Path("scripts/places_raw.json")
GENERATED_DIR = Path("src/data/categories")


def fetch_query(category: str, query: str) -> list[dict]:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "locationBias": LOCATION_BIAS,
        "languageCode": "en",
        "regionCode": "cz",
        "maxResultCount": 20,
    }
    resp = requests.post(TEXT_SEARCH_URL, headers=headers, json=body, timeout=15)
    if resp.status_code != 200:
        print(f"  [{category}] {query!r}: HTTP {resp.status_code} {resp.text[:200]}")
        return []
    data = resp.json()
    places = data.get("places", [])
    print(f"  [{category}] {query!r}: {len(places)} places")
    return places


def price_level_num(pl: str | None) -> int | None:
    if not pl:
        return None
    # Google returns "PRICE_LEVEL_FREE" / "PRICE_LEVEL_INEXPENSIVE" / etc.
    mapping = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return mapping.get(pl)


def derive_district(address: str) -> str:
    """Best-effort district extraction from formatted address."""
    districts = [
        "Staré Město",
        "Malá Strana",
        "Hradčany",
        "Josefov",
        "Nové Město",
        "Vyšehrad",
        "Vinohrady",
        "Žižkov",
        "Holešovice",
        "Karlín",
        "Smíchov",
        "Dejvice",
        "Letná",
    ]
    for d in districts:
        if d in address:
            return d
    return "Other"


def to_typescript(category: str, places: list[dict], start_id: int) -> str:
    """Render a src/data/categories/<category>.generated.ts file."""
    lines = [
        'import { Place } from "@/lib/types";',
        "",
        f"/** Auto-generated from Google Places API. Do not edit by hand. */",
        f"export const {category}sGenerated: Place[] = [",
    ]
    for i, p in enumerate(places):
        name = p.get("displayName", {}).get("text", "").replace('"', '\\"')
        if not name:
            continue
        addr = p.get("formattedAddress", "").replace('"', '\\"')
        short_addr = p.get("shortFormattedAddress") or addr
        loc = p.get("location", {})
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        if lat is None or lng is None:
            continue
        rating = p.get("rating")
        rating_count = p.get("userRatingCount")
        price = price_level_num(p.get("priceLevel"))
        website = p.get("websiteUri", "")
        phone = p.get("internationalPhoneNumber") or p.get("nationalPhoneNumber", "")
        ed_summary = p.get("editorialSummary", {}).get("text", "") if isinstance(
            p.get("editorialSummary"), dict
        ) else ""
        types = p.get("types", [])
        tag_str = ",".join(types[:6])
        district = derive_district(addr)

        lines.append("  {")
        lines.append(f"    id: {start_id + i},")
        lines.append(f"    placeId: {json.dumps(p.get('id', ''))},")
        lines.append(f'    category: "{category}",')
        lines.append(f"    name: {json.dumps(name)},")
        lines.append(f'    tagline: {json.dumps(ed_summary or p.get("primaryType", ""))},')
        lines.append(f"    tags: {json.dumps(tag_str)},")
        lines.append(f"    address: {json.dumps(short_addr)},")
        lines.append(f"    district: {json.dumps(district)},")
        lines.append(f"    lat: {lat},")
        lines.append(f"    lng: {lng},")
        if phone:
            lines.append(f"    phone: {json.dumps(phone)},")
        if website:
            lines.append(f"    website: {json.dumps(website)},")
        if price is not None:
            lines.append(f"    priceLevel: {price},")
        if rating is not None:
            lines.append(f"    rating: {rating},")
        if rating_count is not None:
            lines.append(f"    userRatingsTotal: {rating_count},")
        if ed_summary:
            lines.append(f"    description: {json.dumps(ed_summary)},")
        lines.append("  },")
    lines.append("];")
    return "\n".join(lines) + "\n"


def main() -> int:
    if not API_KEY:
        print("❌ No API key found. Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local")
        print("   Also enable 'Places API (New)' in Google Cloud Console for this project.")
        return 1

    print(f"🔑 Using API key ending ...{API_KEY[-6:]}")
    print()

    raw: dict[str, list[dict]] = {c: [] for c in QUERIES}

    for category, queries in QUERIES.items():
        print(f"📍 {category}")
        seen_ids: set[str] = set()
        for q in queries:
            places = fetch_query(category, q)
            for p in places:
                pid = p.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    raw[category].append(p)
            time.sleep(0.2)  # be nice

    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)
    RAW_OUT.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n💾 Raw results saved to {RAW_OUT}")

    # Write generated TS files with id offsets so they don't collide with the curated seeds.
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    id_offsets = {
        "restaurant": 1000,
        "bar": 2000,
        "sight": 3000,
        "cafe": 4000,
        "club": 5000,
    }
    for category, places in raw.items():
        ts = to_typescript(category, places, id_offsets[category])
        out = GENERATED_DIR / f"{category}s.generated.ts"
        out.write_text(ts, encoding="utf-8")
        print(f"💾 {out} ({len(places)} places)")

    print("\n✅ Done. Edit src/data/places.ts to import the *.generated.ts files if you want them in the app.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
