import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

function prefix(env: string | null): string {
  const suffix = env === "test" ? "-test" : "";
  return `split${suffix}/walliprag/settlements/`;
}

export async function POST(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = await request.json();
  const { from, to, amount, currency, method, date } = body as {
    from?: string; to?: string; amount?: number;
    currency?: string; method?: string; date?: string;
  };

  if (!from || !to || !amount) {
    return NextResponse.json({ error: "from, to, amount required" }, { status: 400 });
  }

  const settlement = {
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from,
    to,
    amount,
    currency: currency || "CZK",
    method: method || "cash",
    date: date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };

  try {
    await put(`${prefix(env)}${settlement.id}.json`, JSON.stringify(settlement), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, settlement });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
