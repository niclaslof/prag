import { put, list, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/**
 * User registry. Key is phone number (sanitised).
 * No verification — just persistent storage of profiles so the app
 * knows who is in the group without re-registration.
 */

function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").slice(0, 20);
}

function prefix(env: string | null): string {
  const suffix = env === "test" ? "-test" : "";
  return `users${suffix}/`;
}

// Auto-pick a color based on name hash
const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#c026d3", "#65a30d"];
function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface User {
  phone: string;
  name: string;
  color: string;
  avatar: string;
  createdAt: string;
  deleted?: boolean;
}

// POST = register or update
export async function POST(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = await request.json();
  const { phone: rawPhone, name } = body as { phone?: string; name?: string };

  if (!rawPhone || !name?.trim()) {
    return NextResponse.json({ error: "phone and name required" }, { status: 400 });
  }

  const phone = sanitizePhone(rawPhone);
  if (phone.length < 6) {
    return NextResponse.json({ error: "invalid phone number" }, { status: 400 });
  }

  const user: User = {
    phone,
    name: name.trim().slice(0, 30),
    color: pickColor(name.trim()),
    avatar: name.trim().charAt(0).toUpperCase(),
    createdAt: new Date().toISOString(),
  };

  try {
    await put(`${prefix(env)}${encodeURIComponent(phone)}.json`, JSON.stringify(user), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET = list all users (for group member picker)
export async function GET(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const { blobs } = await list({ prefix: prefix(env) });
  const users: User[] = [];
  for (const b of blobs) {
    try {
      const res = await fetch(b.url + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const u = (await res.json()) as User;
        if (!u.deleted) users.push(u);
      }
    } catch { /* skip */ }
  }
  users.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

// DELETE = remove user (soft delete — preserves history)
export async function DELETE(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = await request.json();
  const { phone: rawPhone } = body as { phone?: string };
  if (!rawPhone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const phone = sanitizePhone(rawPhone);

  try {
    // Soft delete in prod (keep as "[Deleted]" to preserve balances)
    // Hard delete in test
    if (env === "test") {
      const { blobs } = await list({ prefix: `${prefix(env)}${encodeURIComponent(phone)}` });
      for (const b of blobs) await del(b.url);
    } else {
      // Soft delete — update the record
      const deletedUser: User = {
        phone,
        name: "[Deleted]",
        color: "#78716c",
        avatar: "?",
        createdAt: new Date().toISOString(),
        deleted: true,
      };
      await put(`${prefix(env)}${encodeURIComponent(phone)}.json`, JSON.stringify(deletedUser), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
