"use client";

import { useEffect, useState, useCallback } from "react";

interface Expense {
  id: string; description: string; amount: number; currency: "CZK" | "SEK";
  paidBy: string; splitType: string; splits: { name: string; share: number }[];
  category: string; date: string; createdAt: string;
}
interface Balance { from: string; to: string; amount: number; }
interface Stats { totalCZK: number; totalSEK: number; expenseCount: number; people: string[]; byCategory: Record<string, number>; }
interface Activity { type: string; text: string; time: string; emoji: string; }

const CATEGORIES: { id: string; emoji: string; label: string }[] = [
  { id: "food", emoji: "🍽", label: "Mat & Dryck" },
  { id: "transport", emoji: "🚕", label: "Transport" },
  { id: "hotel", emoji: "🏨", label: "Boende" },
  { id: "activity", emoji: "🎟", label: "Aktivitet" },
  { id: "shopping", emoji: "🛍", label: "Shopping" },
  { id: "spa", emoji: "🧖", label: "Spa" },
  { id: "other", emoji: "💰", label: "Övrigt" },
];

const QUICK_PRESETS = [
  { label: "☕ Fika", category: "food", defaultAmount: 150 },
  { label: "🍽 Middag", category: "food", defaultAmount: 800 },
  { label: "🍺 Öl", category: "food", defaultAmount: 80 },
  { label: "🚕 Taxi", category: "transport", defaultAmount: 300 },
  { label: "🚇 Metro", category: "transport", defaultAmount: 40 },
  { label: "🎟 Entré", category: "activity", defaultAmount: 250 },
];

function catEmoji(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.emoji || "💰";
}

interface SplitPanelProps { isOpen: boolean; onClose: () => void; }

type Tab = "expenses" | "balances" | "add" | "feed";

export default function SplitPanel({ isOpen, onClose }: SplitPanelProps) {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  // Search + filter
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Add expense form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"CZK" | "SEK">("CZK");
  const [paidBy, setPaidBy] = useState(() => typeof window !== "undefined" ? localStorage.getItem("walliprag-name") || "" : "");
  const [category, setCategory] = useState("food");
  const [splitNames, setSplitNames] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "amount">("equal");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Settle form
  const [settleFrom, setSettleFrom] = useState("");
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleMethod, setSettleMethod] = useState("Swish");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/split");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setBalances(data.balances || []);
        setActivity(data.activity || []);
        setStats(data.stats || null);
        // Auto-fill split names from known people
        if (data.stats?.people?.length && !splitNames) {
          setSplitNames(data.stats.people.join(", "));
        }
      }
    } catch { /* ok */ }
    setLoading(false);
  }, [splitNames]);

  useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

  const handleAddExpense = async () => {
    if (!desc.trim() || !amount || !paidBy.trim()) return;
    const names = splitNames.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;

    localStorage.setItem("walliprag-name", paidBy.trim());
    setSubmitting(true);

    const amtNum = parseFloat(amount);
    const splits = names.map((name) => ({
      name,
      share: splitType === "equal" ? Math.round(amtNum / names.length * 100) / 100 : amtNum / names.length,
    }));

    try {
      const res = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc.trim(),
          amount: amtNum,
          currency,
          paidBy: paidBy.trim(),
          splitType,
          splits,
          category,
          createdBy: paidBy.trim(),
        }),
      });
      if (res.ok) {
        setSuccessMsg(`✓ ${desc} — ${amount} ${currency} added!`);
        setDesc("");
        setAmount("");
        setTab("expenses");
        fetchData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch { /* ok */ }
    setSubmitting(false);
  };

  const handleSettle = async () => {
    if (!settleFrom || !settleTo || !settleAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/split/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: settleFrom,
          to: settleTo,
          amount: parseFloat(settleAmount),
          currency,
          method: settleMethod,
        }),
      });
      if (res.ok) {
        setSettleAmount("");
        fetchData();
      }
    } catch { /* ok */ }
    setSubmitting(false);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-[75] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />

      <aside className={`fixed right-0 top-0 bottom-0 w-[520px] max-w-[95vw] bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink text-paper px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold">Walli Split 💸</h2>
            {stats && stats.expenseCount > 0 ? (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[0.72rem] font-bold text-amber-400 tabular-nums">{stats.totalCZK.toLocaleString()} CZK</span>
                <span className="text-[0.65rem] text-warm">~{stats.totalSEK.toLocaleString()} SEK</span>
                <span className="text-[0.65rem] text-warm">· {stats.expenseCount} st</span>
              </div>
            ) : (
              <p className="text-[0.68rem] text-warm mt-0.5">Track & split expenses with your group</p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg cursor-pointer">✕</button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[72px] z-10 bg-panel border-b border-stone-200 dark:border-stone-800 px-3 py-2 flex gap-1.5">
          {([["expenses", "Expenses"], ["balances", "Balance"], ["feed", "Feed"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-full text-[0.68rem] font-semibold cursor-pointer transition-colors ${tab === t ? "bg-ink text-paper dark:bg-paper dark:text-ink" : "bg-stone-100 dark:bg-stone-800 text-warm"}`}
            >{label}</button>
          ))}
          <button onClick={() => setTab("add")}
            className={`px-4 py-2 rounded-full text-[0.68rem] font-semibold cursor-pointer transition-colors ${tab === "add" ? "bg-accent text-white" : "bg-accent/20 text-accent"}`}
          >+ Add</button>
        </div>

        <div className="p-5">
          {/* Success toast */}
          {successMsg && (
            <div className="mb-3 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 text-sm font-medium animate-pulse">
              {successMsg}
            </div>
          )}
          {loading && <div className="flex items-center gap-2 py-8 text-warm text-sm"><div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />Loading…</div>}

          {/* EXPENSES TAB */}
          {!loading && tab === "expenses" && (() => {
            const filtered = expenses.filter((e) => {
              if (search && !e.description.toLowerCase().includes(search.toLowerCase()) && !e.paidBy.toLowerCase().includes(search.toLowerCase())) return false;
              if (filterCat && e.category !== filterCat) return false;
              return true;
            });
            // Group by date
            const grouped: Record<string, Expense[]> = {};
            filtered.forEach((e) => { (grouped[e.date] ||= []).push(e); });
            const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
            // Day labels
            const tripStart = expenses.length > 0 ? expenses[expenses.length - 1].date : "";
            const dayLabel = (date: string) => {
              if (!tripStart) return date;
              const d1 = new Date(tripStart), d2 = new Date(date);
              const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
              return `Dag ${diff} · ${new Date(date).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}`;
            };

            return (
              <div className="space-y-3">
                {/* Search + filter */}
                <div className="flex gap-2">
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…"
                    className="flex-1 px-3 py-1.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs outline-none focus:border-accent" />
                  <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                    className="px-2 py-1.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[0.68rem] text-ink">
                    <option value="">All</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>

                {expenses.length === 0 && (
                  <div className="text-center py-8 text-warm">
                    <span className="text-5xl block mb-3">💸</span>
                    <p className="text-sm font-semibold mb-2">No expenses yet</p>
                    <p className="text-[0.72rem] mb-4">Start tracking your trip spending!</p>
                    <button onClick={() => setTab("add")} className="px-5 py-2.5 rounded-full bg-accent text-white text-sm font-semibold cursor-pointer hover:bg-accent-light transition-colors">
                      + Add first expense
                    </button>
                  </div>
                )}

                {dates.map((date) => (
                  <div key={date}>
                    <div className="text-[0.62rem] uppercase tracking-wider text-warm font-bold mb-1.5 mt-2">{dayLabel(date)}</div>
                    <div className="space-y-1.5">
                      {grouped[date].map((e) => (
                        <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <span className="text-2xl">{catEmoji(e.category)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{e.description}</div>
                            <div className="text-[0.65rem] text-warm">
                              {e.paidBy} paid · {e.splits.length} people
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-ink tabular-nums">{e.amount.toLocaleString()} {e.currency}</div>
                            <div className="text-[0.6rem] text-warm">{Math.round(e.amount / e.splits.length)} ea</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && expenses.length > 0 && (
                  <p className="text-sm text-warm text-center py-4">No matching expenses</p>
                )}
              </div>
            );
          })()}

          {/* BALANCES TAB */}
          {!loading && tab === "balances" && (
            <div className="space-y-4">
              {/* Summary cards */}
              {stats && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 text-center">
                    <div className="text-[0.6rem] uppercase text-warm tracking-wider">Total spent</div>
                    <div className="font-[family-name:var(--font-playfair)] text-xl font-bold text-ink">{stats.totalCZK.toLocaleString()}</div>
                    <div className="text-[0.65rem] text-warm">CZK (~{stats.totalSEK.toLocaleString()} SEK)</div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 text-center">
                    <div className="text-[0.6rem] uppercase text-warm tracking-wider">Per person</div>
                    <div className="font-[family-name:var(--font-playfair)] text-xl font-bold text-ink">
                      {stats.people.length > 0 ? Math.round(stats.totalCZK / stats.people.length).toLocaleString() : 0}
                    </div>
                    <div className="text-[0.65rem] text-warm">CZK average</div>
                  </div>
                </div>
              )}

              {/* Category pie chart + breakdown */}
              {stats && Object.keys(stats.byCategory).length > 0 && (() => {
                const entries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
                const colors = ["#b91c1c", "#b45309", "#1d4ed8", "#15803d", "#be185d", "#0d9488", "#78716c"];
                // SVG pie chart
                let startAngle = -90;
                const slices = entries.map(([cat, czk], i) => {
                  const pct = (czk / stats.totalCZK) * 100;
                  const angle = (pct / 100) * 360;
                  const s = startAngle;
                  startAngle += angle;
                  const r = 45, cx = 50, cy = 50;
                  const rad1 = (s * Math.PI) / 180, rad2 = ((s + angle) * Math.PI) / 180;
                  const x1 = cx + r * Math.cos(rad1), y1 = cy + r * Math.sin(rad1);
                  const x2 = cx + r * Math.cos(rad2), y2 = cy + r * Math.sin(rad2);
                  const large = angle > 180 ? 1 : 0;
                  return { cat, czk, pct, color: colors[i % colors.length], d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` };
                });

                return (
                  <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 mb-4">
                    <h3 className="text-[0.62rem] uppercase tracking-wider text-warm font-bold mb-3">Spending breakdown</h3>
                    <div className="flex items-center gap-4">
                      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
                        {slices.map((s) => <path key={s.cat} d={s.d} fill={s.color} />)}
                      </svg>
                      <div className="space-y-1.5 flex-1">
                        {slices.map((s) => (
                          <div key={s.cat} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[0.68rem] text-ink flex-1">{catEmoji(s.cat)} {CATEGORIES.find((c) => c.id === s.cat)?.label || s.cat}</span>
                            <span className="text-[0.65rem] font-bold text-ink tabular-nums">{Math.round(s.pct)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-3 border-t border-stone-200 dark:border-stone-700 pt-3">
                      {entries.map(([cat, czk]) => (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-lg w-7">{catEmoji(cat)}</span>
                          <span className="text-[0.72rem] font-medium text-ink flex-1">{CATEGORIES.find((c) => c.id === cat)?.label || cat}</span>
                          <span className="text-[0.72rem] font-bold text-ink tabular-nums">{Math.round(czk).toLocaleString()} CZK</span>
                          <div className="w-16 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${(czk / stats.totalCZK) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Daily spending bar chart */}
              {expenses.length > 0 && (() => {
                const byDay: Record<string, number> = {};
                expenses.forEach((e) => {
                  const czk = e.currency === "SEK" ? e.amount * 2.35 : e.amount;
                  byDay[e.date] = (byDay[e.date] || 0) + czk;
                });
                const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
                const max = Math.max(...days.map(([, v]) => v));
                const tripStart = days[0]?.[0] || "";

                return (
                  <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 mb-4">
                    <h3 className="text-[0.62rem] uppercase tracking-wider text-warm font-bold mb-3">Daily spending</h3>
                    <div className="flex items-end gap-1 h-24">
                      {days.map(([date, czk]) => {
                        const d1 = new Date(tripStart), d2 = new Date(date);
                        const dayNum = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
                        return (
                          <div key={date} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-t bg-accent" style={{ height: `${(czk / max) * 100}%`, minHeight: 4 }} />
                            <span className="text-[0.5rem] text-warm">D{dayNum}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Export CSV */}
              {expenses.length > 0 && (
                <button
                  onClick={() => {
                    const header = "Date,Description,Amount,Currency,PaidBy,Category,SplitBetween\n";
                    const rows = expenses.map((e) =>
                      `${e.date},"${e.description}",${e.amount},${e.currency},${e.paidBy},${e.category},"${e.splits.map((s) => s.name).join("; ")}"`
                    ).join("\n");
                    const blob = new Blob([header + rows], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "walliprag-expenses.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-[0.72rem] text-warm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  📊 Export to CSV
                </button>
              )}

              {/* Who owes whom */}
              <h3 className="text-[0.62rem] uppercase tracking-wider text-warm font-bold">Who owes whom</h3>
              {balances.length === 0 && <p className="text-sm text-warm py-4">All settled up! 🎉</p>}
              {balances.map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {b.from} → {b.to}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">{b.amount} CZK</div>
                  <button
                    onClick={() => { setSettleFrom(b.from); setSettleTo(b.to); setSettleAmount(String(b.amount)); setTab("add"); }}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[0.68rem] font-semibold cursor-pointer hover:bg-green-700 transition-colors"
                  >Settle</button>
                </div>
              ))}
            </div>
          )}

          {/* ADD TAB */}
          {tab === "add" && (
            <div className="space-y-5">
              {/* Expense form */}
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-ink mb-2">Quick add</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => { setDesc(p.label.slice(2).trim()); setAmount(String(p.defaultAmount)); setCategory(p.category); setCurrency("CZK"); }}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[0.68rem] font-medium text-ink hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors border border-stone-200 dark:border-stone-700"
                    >{p.label}</button>
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-ink">Custom expense</h3>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What was it for?" className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-ink outline-none focus:border-accent" />

                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-ink outline-none focus:border-accent tabular-nums" />
                  <div className="flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                    {(["CZK", "SEK"] as const).map((c) => (
                      <button key={c} onClick={() => setCurrency(c)} className={`px-3 py-2 text-[0.68rem] font-semibold cursor-pointer ${currency === c ? "bg-accent text-white" : "bg-stone-50 dark:bg-stone-800 text-warm"}`}>{c}</button>
                    ))}
                  </div>
                </div>

                <input type="text" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="Who paid?" className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-ink outline-none focus:border-accent" />

                <div>
                  <label className="text-[0.62rem] uppercase tracking-wider text-warm font-semibold block mb-1">Split between</label>
                  <input type="text" value={splitNames} onChange={(e) => setSplitNames(e.target.value)} placeholder="Tommy, Niclas, Sara, ..." className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-ink outline-none focus:border-accent" />
                  <p className="text-[0.6rem] text-warm mt-1">Comma-separated names</p>
                </div>

                {/* Category */}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c.id} onClick={() => setCategory(c.id)}
                      className={`px-2.5 py-1 rounded-full text-[0.62rem] font-semibold cursor-pointer border transition-colors ${category === c.id ? "bg-accent text-white border-accent" : "bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-warm"}`}
                    >{c.emoji} {c.label}</button>
                  ))}
                </div>

                <button onClick={handleAddExpense} disabled={submitting || !desc || !amount || !paidBy}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors cursor-pointer disabled:opacity-40"
                >{submitting ? "Saving…" : "Add expense"}</button>
              </div>

              {/* Settle up form */}
              <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Settle up</h3>
                <div className="flex gap-2">
                  <input type="text" value={settleFrom} onChange={(e) => setSettleFrom(e.target.value)} placeholder="From" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-green-200 dark:border-green-800 text-sm text-ink outline-none" />
                  <span className="self-center text-warm">→</span>
                  <input type="text" value={settleTo} onChange={(e) => setSettleTo(e.target.value)} placeholder="To" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-green-200 dark:border-green-800 text-sm text-ink outline-none" />
                </div>
                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-green-200 dark:border-green-800 text-sm text-ink outline-none tabular-nums" />
                  <select value={settleMethod} onChange={(e) => setSettleMethod(e.target.value)} className="px-3 py-2 rounded-lg bg-white dark:bg-stone-800 border border-green-200 dark:border-green-800 text-sm text-ink">
                    <option>Swish</option>
                    <option>Cash</option>
                    <option>Revolut</option>
                    <option>Card</option>
                  </select>
                </div>
                <button onClick={handleSettle} disabled={submitting || !settleFrom || !settleTo || !settleAmount}
                  className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-40"
                >{submitting ? "Saving…" : "Record payment"}</button>
              </div>
            </div>
          )}

          {/* FEED TAB */}
          {!loading && tab === "feed" && (
            <div className="space-y-2">
              <h3 className="text-[0.62rem] uppercase tracking-wider text-warm font-bold mb-2">Activity</h3>
              {activity.length === 0 && <p className="text-sm text-warm text-center py-8">No activity yet</p>}
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-stone-100 dark:border-stone-800 last:border-0">
                  <span className="text-xl shrink-0 mt-0.5">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.75rem] text-ink leading-snug">{a.text}</p>
                    <p className="text-[0.6rem] text-warm mt-0.5">
                      {new Date(a.time).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Share trip summary */}
              {stats && stats.expenseCount > 0 && (
                <button
                  onClick={() => {
                    const text = `🧳 Walli Prag Trip\n💰 Total: ${stats.totalCZK.toLocaleString()} CZK (~${stats.totalSEK.toLocaleString()} SEK)\n👥 ${stats.people.length} people · ${stats.expenseCount} expenses\n📊 Per person: ~${Math.round(stats.totalCZK / stats.people.length).toLocaleString()} CZK`;
                    if (navigator.share) {
                      navigator.share({ title: "Walli Prag Trip Summary", text });
                    } else {
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  className="w-full mt-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors cursor-pointer"
                >
                  📤 Share trip summary
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
