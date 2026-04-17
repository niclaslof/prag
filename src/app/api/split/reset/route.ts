import { list, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/** Delete ALL test-mode data. Only works for env=test. */
export async function POST(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  if (env !== "test") {
    return NextResponse.json(
      { error: "Reset only works in test mode. Add ?env=test" },
      { status: 403 }
    );
  }

  let deleted = 0;
  const prefixes = [
    "split-test/",
    "users-test/",
  ];

  for (const prefix of prefixes) {
    try {
      const { blobs } = await list({ prefix });
      for (const b of blobs) {
        try {
          await del(b.url);
          deleted++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, deleted });
}
