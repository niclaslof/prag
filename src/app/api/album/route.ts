import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const lat = formData.get("lat") as string | null;
  const lng = formData.get("lng") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Encode GPS in the pathname so we can parse it back when listing
  const gps = lat && lng ? `_GPS${lat}_${lng}` : "";
  const pathname = `album/${timestamp}${gps}-${safeName}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Blob upload failed: ${msg}` },
      { status: 500 }
    );
  }
}

const GPS_REGEX = /_GPS(-?\d+\.?\d*)_(-?\d+\.?\d*)-/;

export async function GET() {
  const { blobs } = await list({ prefix: "album/" });

  const photos = blobs
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .map((b) => {
      const gpsMatch = b.pathname.match(GPS_REGEX);
      return {
        url: b.url,
        name: b.pathname.replace("album/", "").replace(/^\d+(_GPS[^-]*)?\-/, ""),
        uploadedAt: b.uploadedAt,
        size: b.size,
        lat: gpsMatch ? parseFloat(gpsMatch[1]) : null,
        lng: gpsMatch ? parseFloat(gpsMatch[2]) : null,
      };
    });

  const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
  const limitBytes = 500 * 1024 * 1024;

  return NextResponse.json({
    photos,
    storage: {
      usedBytes: totalBytes,
      usedMB: Math.round(totalBytes / 1024 / 1024 * 10) / 10,
      limitMB: 500,
      percent: Math.round((totalBytes / limitBytes) * 100),
    },
  });
}
