import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

interface Group {
  id: string;
  name: string;
  emoji: string;
  createdBy: string;
  createdAt: string;
  memberPhones: string[];
}

function prefix(env: string | null): string {
  const suffix = env === "test" ? "-test" : "";
  return `groups${suffix}/`;
}

const EMOJIS = ["✈️", "🏝", "🏔", "🌆", "🎡", "🏛", "🎭", "🍷", "🎿", "⛵"];

function pickEmoji(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return EMOJIS[Math.abs(hash) % EMOJIS.length];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "group";
}

// POST = create group
export async function POST(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = await request.json();
  const { name, createdBy, creatorPhone } = body as {
    name?: string; createdBy?: string; creatorPhone?: string;
  };

  if (!name?.trim() || !createdBy || !creatorPhone) {
    return NextResponse.json({ error: "name, createdBy, creatorPhone required" }, { status: 400 });
  }

  const id = `${slugify(name)}-${Date.now().toString(36).slice(-4)}`;
  const group: Group = {
    id,
    name: name.trim().slice(0, 50),
    emoji: pickEmoji(name),
    createdBy,
    createdAt: new Date().toISOString(),
    memberPhones: [creatorPhone],
  };

  try {
    await put(`${prefix(env)}${id}.json`, JSON.stringify(group), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, group });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET = list all groups (for switching)
export async function GET(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const { blobs } = await list({ prefix: prefix(env) });
  const groups: Group[] = [];
  for (const b of blobs) {
    try {
      const res = await fetch(b.url + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) groups.push(await res.json());
    } catch { /* skip */ }
  }
  groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
}

// PATCH = join group (add phone to memberPhones)
export async function PATCH(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = await request.json();
  const { groupId, phone } = body as { groupId?: string; phone?: string };

  if (!groupId || !phone) {
    return NextResponse.json({ error: "groupId and phone required" }, { status: 400 });
  }

  try {
    const { blobs } = await list({ prefix: `${prefix(env)}${groupId}.json` });
    if (blobs.length === 0) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const res = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
    const group: Group = await res.json();
    if (!group.memberPhones.includes(phone)) {
      group.memberPhones.push(phone);
      await put(`${prefix(env)}${groupId}.json`, JSON.stringify(group), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
    }
    return NextResponse.json({ ok: true, group });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
