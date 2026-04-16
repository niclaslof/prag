import { put, list, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/**
 * Live location sharing. Each user PUTs their position every ~30s.
 * GET returns all active positions (last 10 min).
 * Stored as locations/<name>.json in Vercel Blob.
 */

const STALE_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, lat, lng } = body as { name?: string; lat?: number; lng?: number };

  if (!name?.trim() || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "name, lat, lng required" }, { status: 400 });
  }

  const safeName = name.trim().slice(0, 30).replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, "");
  const pathname = `locations/${safeName}.json`;

  const data = {
    name: safeName,
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  };

  try {
    await put(pathname, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { blobs } = await list({ prefix: "locations/" });
  const now = Date.now();

  const people: { name: string; lat: number; lng: number; updatedAt: string; stale: boolean }[] = [];

  for (const b of blobs) {
    try {
      const res = await fetch(b.url);
      if (!res.ok) continue;
      const data = await res.json();
      const age = now - new Date(data.updatedAt).getTime();

      if (age > STALE_MS) {
        // Clean up stale locations
        try { await del(b.url); } catch { /* ok */ }
        continue;
      }

      people.push({
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        updatedAt: data.updatedAt,
        stale: age > 5 * 60 * 1000, // >5 min = fading
      });
    } catch { /* skip */ }
  }

  return NextResponse.json({ people });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { name } = body as { name?: string };
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const safeName = name.trim().slice(0, 30).replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, "");
  try {
    const { blobs } = await list({ prefix: `locations/${safeName}.json` });
    for (const b of blobs) await del(b.url);
  } catch { /* ok */ }

  return NextResponse.json({ ok: true });
}
