import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

interface LineItem {
  description: string;
  amount: number;
}

/** Parse text lines from Vision API into structured receipt items. */
function parseReceiptText(text: string): { items: LineItem[]; total: number | null; currency: "CZK" | "SEK" } {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const items: LineItem[] = [];
  let total: number | null = null;
  let currency: "CZK" | "SEK" = "CZK";

  // Detect currency
  if (/SEK|kr\b/i.test(text)) currency = "SEK";

  for (const line of lines) {
    // Look for lines like "Pizza Margherita    189" or "2x Beer 78"
    // Match: text followed by a number (possibly with decimals/comma)
    const match = line.match(/^(.+?)\s+(\d[\d\s.,]*\d|\d)[\s]*(?:CZK|Kč|SEK|kr)?$/i);
    if (match) {
      const desc = match[1].replace(/\.{2,}/g, "").trim();
      const amt = parseFloat(match[2].replace(/\s/g, "").replace(",", "."));
      if (desc.length >= 2 && amt > 0 && amt < 100000) {
        // Skip totals/subtotals — detect by keyword
        const lower = desc.toLowerCase();
        if (/total|celkem|suma|součet|subtotal|dph|vat|tax|daň|tip|spropitné/i.test(lower)) {
          if (/total|celkem|suma/i.test(lower)) total = amt;
          continue;
        }
        items.push({ description: desc, amount: amt });
      }
    }
  }

  // If no items found but we have a total, return just the total
  if (items.length === 0 && total) {
    items.push({ description: "Total", amount: total });
  }

  // Guess total from items if not found
  if (!total && items.length > 0) {
    total = items.reduce((s, i) => s + i.amount, 0);
  }

  return { items, total, currency };
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Convert to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  try {
    const visionRes = await fetch(VISION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        }],
      }),
    });

    if (!visionRes.ok) {
      const err = await visionRes.text();
      return NextResponse.json({
        error: `Vision API error: ${visionRes.status}. Make sure Cloud Vision API is enabled.`,
        detail: err.slice(0, 300),
      }, { status: 502 });
    }

    const data = await visionRes.json();
    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";

    if (!fullText) {
      return NextResponse.json({
        error: "No text found in image. Try a clearer photo of the receipt.",
        rawText: "",
        items: [],
        total: null,
        currency: "CZK",
      });
    }

    const parsed = parseReceiptText(fullText);

    return NextResponse.json({
      rawText: fullText,
      items: parsed.items,
      total: parsed.total,
      currency: parsed.currency,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
