import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const CATEGORIES_EMOJI: Record<string, string> = {
  food: "🍽", transport: "🚕", hotel: "🏨", activity: "🎟",
  shopping: "🛍", spa: "🧖", other: "💰",
};

/** Env-aware prefix. Test and prod are fully isolated. */
function prefix(env: string | null, type: "expenses" | "settlements"): string {
  const suffix = env === "test" ? "-test" : "";
  return `split${suffix}/walliprag/${type}/`;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: "CZK" | "SEK";
  paidBy: string;
  splitType: "equal" | "amount" | "percent";
  splits: { name: string; share: number }[];
  category: string;
  date: string;
  createdBy: string;
  createdAt: string;
  receiptUrl?: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: "CZK" | "SEK";
  method: string;
  date: string;
  createdAt: string;
}

// POST = create expense
export async function POST(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  const body = (await request.json()) as Partial<Expense>;

  if (!body.description || !body.amount || !body.paidBy || !body.splits?.length) {
    return NextResponse.json({ error: "description, amount, paidBy, splits required" }, { status: 400 });
  }

  const expense: Expense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: body.description.slice(0, 200),
    amount: body.amount,
    currency: body.currency || "CZK",
    paidBy: body.paidBy,
    splitType: body.splitType || "equal",
    splits: body.splits,
    category: body.category || "other",
    date: body.date || new Date().toISOString().slice(0, 10),
    createdBy: body.createdBy || body.paidBy,
    createdAt: new Date().toISOString(),
    receiptUrl: body.receiptUrl,
  };

  try {
    await put(`${prefix(env, "expenses")}${expense.id}.json`, JSON.stringify(expense), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, expense });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET = list all expenses + calculate balances
export async function GET(request: NextRequest) {
  const env = new URL(request.url).searchParams.get("env");
  // Fetch expenses
  const { blobs: expBlobs } = await list({ prefix: prefix(env, "expenses") });
  const expenses: Expense[] = [];
  for (const b of expBlobs) {
    try {
      const res = await fetch(b.url + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) expenses.push(await res.json());
    } catch { /* skip */ }
  }
  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Fetch settlements
  const { blobs: setBlobs } = await list({ prefix: prefix(env, "settlements") });
  const settlements: Settlement[] = [];
  for (const b of setBlobs) {
    try {
      const res = await fetch(b.url + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) settlements.push(await res.json());
    } catch { /* skip */ }
  }

  // Calculate net balances (in CZK — convert SEK at ~2.35)
  const SEK_TO_CZK = 2.35;
  const debts: Record<string, Record<string, number>> = {}; // debts[A][B] = A owes B

  for (const exp of expenses) {
    const amountCZK = exp.currency === "SEK" ? exp.amount * SEK_TO_CZK : exp.amount;
    for (const s of exp.splits) {
      if (s.name === exp.paidBy) continue;
      const shareCZK = exp.currency === "SEK" ? s.share * SEK_TO_CZK : s.share;
      if (!debts[s.name]) debts[s.name] = {};
      debts[s.name][exp.paidBy] = (debts[s.name][exp.paidBy] || 0) + shareCZK;
    }
  }

  // Apply settlements
  for (const s of settlements) {
    const amountCZK = s.currency === "SEK" ? s.amount * SEK_TO_CZK : s.amount;
    if (debts[s.from]?.[s.to]) {
      debts[s.from][s.to] = Math.max(0, debts[s.from][s.to] - amountCZK);
    }
  }

  // Simplify: net out A→B vs B→A
  const netBalances: { from: string; to: string; amount: number }[] = [];
  const seen = new Set<string>();

  for (const a of Object.keys(debts)) {
    for (const b of Object.keys(debts[a])) {
      const key = [a, b].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      const aOwesB = debts[a]?.[b] || 0;
      const bOwesA = debts[b]?.[a] || 0;
      const net = aOwesB - bOwesA;

      if (Math.abs(net) > 1) { // ignore < 1 CZK
        if (net > 0) {
          netBalances.push({ from: a, to: b, amount: Math.round(net) });
        } else {
          netBalances.push({ from: b, to: a, amount: Math.round(-net) });
        }
      }
    }
  }

  // Stats
  const totalCZK = expenses.reduce((sum, e) => sum + (e.currency === "SEK" ? e.amount * SEK_TO_CZK : e.amount), 0);
  const people = new Set<string>();
  expenses.forEach((e) => { people.add(e.paidBy); e.splits.forEach((s) => people.add(s.name)); });

  // Per-category totals
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const czk = e.currency === "SEK" ? e.amount * SEK_TO_CZK : e.amount;
    byCategory[e.category] = (byCategory[e.category] || 0) + czk;
  }

  // Build activity feed
  type Activity = { type: string; text: string; time: string; emoji: string };
  const activity: Activity[] = [];
  for (const e of expenses) {
    const perPerson = Math.round(e.amount / e.splits.length);
    activity.push({
      type: "expense",
      text: `${e.paidBy} added ${e.amount} ${e.currency} for "${e.description}" (${perPerson} each)`,
      time: e.createdAt,
      emoji: CATEGORIES_EMOJI[e.category] || "💰",
    });
  }
  for (const s of settlements) {
    activity.push({
      type: "settle",
      text: `${s.from} paid ${s.to} ${s.amount} ${s.currency} via ${s.method}`,
      time: s.createdAt,
      emoji: "✅",
    });
  }
  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({
    expenses,
    settlements,
    balances: netBalances,
    activity: activity.slice(0, 50),
    stats: {
      totalCZK: Math.round(totalCZK),
      totalSEK: Math.round(totalCZK / SEK_TO_CZK),
      expenseCount: expenses.length,
      people: Array.from(people),
      byCategory,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
