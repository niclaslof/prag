"""
Generate short, opinionated AI descriptions for every Place using Claude.

Reads src/data/categories/*.ts, extracts all Place objects, and writes
src/data/descriptions.json mapping "<category>-<id>" -> description.

Usage:
    python scripts/generate_descriptions.py

Requires ANTHROPIC_API_KEY in .env.local.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(".env.local")
API_KEY = os.getenv("ANTHROPIC_API_KEY")

CATEGORIES_DIR = Path("src/data/categories")
OUT = Path("src/data/descriptions.json")

MODEL = "claude-sonnet-4-6"

SYSTEM = """You are a sharp, opinionated Prague travel writer. For each place you write ONE short
paragraph (40-70 words) that tells a reader WHY they should care. Voice is confident, specific,
warm. Never say 'nestled' or 'must-visit' or 'hidden gem'. Every description should mention at
least one concrete detail a reader can picture (a dish, a drink, a view, a time of day)."""


def parse_places_from_ts(path: Path) -> list[dict]:
    """Lightweight regex parser — good enough for our hand-written files."""
    text = path.read_text(encoding="utf-8")
    places = []
    # Match each object block
    for block in re.finditer(r"\{([^{}]*?)\},", text, re.DOTALL):
        body = block.group(1)
        obj: dict[str, str] = {}
        for field in ["id", "category", "name", "tagline", "tags", "district", "address"]:
            m = re.search(rf"{field}:\s*([0-9]+|\"[^\"]*\")", body)
            if m:
                val = m.group(1)
                if val.startswith('"'):
                    val = val[1:-1]
                obj[field] = val
        if "id" in obj and "name" in obj:
            places.append(obj)
    return places


def main() -> int:
    if not API_KEY:
        print("❌ ANTHROPIC_API_KEY missing in .env.local")
        return 1

    try:
        import anthropic  # type: ignore
    except ImportError:
        print("❌ Install anthropic: pip install anthropic")
        return 1

    client = anthropic.Anthropic(api_key=API_KEY)

    all_places: list[dict] = []
    for ts_file in sorted(CATEGORIES_DIR.glob("*.ts")):
        if ts_file.name.endswith(".generated.ts"):
            continue
        places = parse_places_from_ts(ts_file)
        print(f"  {ts_file.name}: {len(places)} places")
        all_places.extend(places)

    existing: dict[str, str] = {}
    if OUT.exists():
        existing = json.loads(OUT.read_text(encoding="utf-8"))

    for place in all_places:
        key = f"{place['category']}-{place['id']}"
        if key in existing:
            continue
        prompt = (
            f"Write a short paragraph about this Prague place:\n"
            f"Name: {place['name']}\n"
            f"Category: {place['category']}\n"
            f"District: {place.get('district', '')}\n"
            f"Tagline: {place.get('tagline', '')}\n"
            f"Tags: {place.get('tags', '')}\n\n"
            f"Return ONLY the paragraph, no preamble, 40-70 words."
        )
        print(f"  ✏️  {place['name']}")
        resp = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()  # type: ignore
        existing[key] = text

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n💾 Wrote {len(existing)} descriptions to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
