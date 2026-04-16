import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Only allow images
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  // Max 20 MB
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `album/${timestamp}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url, pathname: blob.pathname });
}

export async function GET() {
  const { blobs } = await list({ prefix: "album/" });

  const photos = blobs
    .filter((b) => /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(b.pathname))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .map((b) => ({
      url: b.url,
      name: b.pathname.replace("album/", "").replace(/^\d+-/, ""),
      uploadedAt: b.uploadedAt,
      size: b.size,
    }));

  return NextResponse.json({ photos });
}
