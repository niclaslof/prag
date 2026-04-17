"""
Fetch photos for every curated place via:
  1. Wikipedia REST API (free, no key, great for famous sights)
  2. Google Places API photo references (fallback, needs API key)

Saves photos to public/images/places/{id}.jpg and prints a JSON
mapping of id -> local path for verifying coverage.

Usage:
    python scripts/fetch_photos.py

Requires: requests, Pillow
Optional: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local for Places fallback
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(".env.local")
GOOGLE_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")

OUT_DIR = Path("public/images/places")
CATEGORIES_DIR = Path("src/data/categories")
RESULTS_FILE = Path("scripts/photo_results.json")

WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
HEADERS = {"User-Agent": "PragExplorer/1.0 (niclaslof; github.com/niclaslof/prag)"}

# Manual Wikipedia article title overrides for places whose name doesn't match
WIKI_OVERRIDES: dict[int, str] = {
    201: "Prague_Castle",
    202: "Charles_Bridge",
    203: "Old_Town_Square_(Prague)",
    204: "Prague_astronomical_clock",
    205: "St._Vitus_Cathedral",
    206: "Church_of_Our_Lady_before_Týn",
    207: "Old_Jewish_Cemetery,_Prague",
    208: "Wenceslas_Square",
    209: "National_Museum_(Prague)",
    210: "Petřín",
    211: "Vyšehrad",
    212: "Strahov_Monastery",
    213: "Dancing_House",
    214: "Lennon_Wall",
    215: "Loreta_(Prague)",
    216: "Letná_Park",
    217: "Powder_Tower_(Prague)",
    301: "Café_Louvre",
    302: "Café_Slavia",
    303: "Café_Imperial_(Prague)",
    108: "U_Fleků",
}


def parse_places() -> list[dict]:
    """Extract id + name from all .ts data files."""
    places = []
    for f in sorted(CATEGORIES_DIR.glob("*.ts")):
        if f.name.endswith(".generated.ts"):
            continue
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r'id:\s*(\d+).*?name:\s*"([^"]+)"', text, re.DOTALL):
            places.append({"id": int(m.group(1)), "name": m.group(2)})
    return places


def fetch_wiki_thumbnail(title: str) -> str | None:
    """Fetch a Wikipedia article thumbnail URL, scaled to 800px."""
    url = WIKI_SUMMARY.format(title=title.replace(" ", "_"))
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        thumb = data.get("thumbnail", {})
        src = thumb.get("source")
        if not src:
            return None
        src = re.sub(r"/\d+px-", "/800px-", src)
        return src
    except Exception:
        return None


def download_image(url: str, dest: Path, max_size: tuple[int, int] = (800, 600)) -> bool:
    """Download and resize image to JPEG."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, stream=True)
        if r.status_code != 200:
            return False
        ct = r.headers.get("content-type", "")
        if "image" not in ct and "octet-stream" not in ct:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(".tmp")
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        img = Image.open(tmp)
        img.thumbnail(max_size, Image.LANCZOS)
        img = img.convert("RGB")
        img.save(dest, "JPEG", quality=82, optimize=True)
        tmp.unlink(missing_ok=True)
        return True
    except Exception as e:
        print(f"    download error: {e}")
        return False


def main() -> int:
    places = parse_places()
    print(f"Found {len(places)} places to fetch photos for.\n")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results: dict[int, str] = {}

    for p in places:
        pid = p["id"]
        name = p["name"]
        dest = OUT_DIR / f"{pid}.jpg"

        if dest.exists():
            print(f"  [{pid}] {name}: already exists, skipping")
            results[pid] = f"/images/places/{pid}.jpg"
            continue

        # Try Wikipedia
        wiki_title = WIKI_OVERRIDES.get(pid, name)
        print(f"  [{pid}] {name}: trying Wikipedia ({wiki_title})...", end=" ")
        thumb_url = fetch_wiki_thumbnail(wiki_title)
        if thumb_url:
            ok = download_image(thumb_url, dest)
            if ok:
                print("OK")
                results[pid] = f"/images/places/{pid}.jpg"
                time.sleep(0.3)
                continue
        print("no image", end="")

        # Google Places API fallback
        if GOOGLE_KEY:
            print(", trying Places API...", end=" ")
            try:
                resp = requests.post(
                    "https://places.googleapis.com/v1/places:searchText",
                    json={
                        "textQuery": f"{name} Prague",
                        "maxResultCount": 1,
                        "locationBias": {
                            "circle": {
                                "center": {"latitude": 50.0875, "longitude": 14.4213},
                                "radius": 6000,
                            }
                        },
                    },
                    headers={
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": GOOGLE_KEY,
                        "X-Goog-FieldMask": "places.photos",
                    },
                    timeout=10,
                )
                if resp.status_code == 200:
                    photos = resp.json().get("places", [{}])[0].get("photos", [])
                    if photos:
                        ref = photos[0].get("name", "")
                        if ref:
                            photo_url = f"https://places.googleapis.com/v1/{ref}/media?maxWidthPx=800&key={GOOGLE_KEY}"
                            ok = download_image(photo_url, dest)
                            if ok:
                                print("OK")
                                results[pid] = f"/images/places/{pid}.jpg"
                                time.sleep(0.5)
                                continue
                print("no photo found")
            except Exception as e:
                print(f"error: {e}")
        else:
            print(" (no Google key)")

        time.sleep(0.2)

    RESULTS_FILE.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nDone. {len(results)}/{len(places)} photos fetched.")
    print(f"Results saved to {RESULTS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
