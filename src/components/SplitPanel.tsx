"use client";

import { useEffect, useState, useCallback } from "react";

interface Expense {
  id: string; description: string; amount: number; currency: "CZK" | "SEK";
  paidBy: string; splitType: string; splits: { name: string; share: number }[];
  category: string; date: string; createdAt: string;
}
interface Balance { from: string; to: string; amount: number; }
interface Stats { totalCZK: number; totalSEK: number; expenseCount: number; people: string[]; byCategory: Record<string, number>; }

const CATEGORIES: { id: string; emoji: string; label: string }[] = [
  { id: "food", emoji: "🍽", label: "Mat & Dryck" },
  { id: "transport", emoji: "🚕", label: "Transport" },
  { id: "hotel", emoji: "🏨", label: "Boende" },
  { id: "activity", emoji: "🎟", label: "Aktivitet" },
  { id: "shopping", emoji: "🛍", label: "Shopping" },
  { id: "spa", emoji: "🧖", label: "Spa" },
  { id: "other", emoji: "💰", label: "Övrigt" },
];

function catEmoji(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.emoji || "💰";
}

interface SplitPanelProps { isOpen: boolean; onClose: () => void; }

type Tab = "expenses" | "balances" | "add";

export default function SplitPanel({ isOpen, onClose }: SplitPanelProps) {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Add expense form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"CZK" | "SEK">("CZK");
  const [paidBy, setPaidBy] = useState(() => typeof window !== "undefined" ? localStorage.getItem("walliprag-name") || "" : "");
  const [category, setCategory] = useState("food");
  const [splitNames, setSplitNames] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "amount">("equal");
  const [submitting, setSubmitting] = useState(false);

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
        setDesc("");
        setAmount("");
        setTab("expenses");
        fetchData();
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
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-warm mb-1">Expense splitting</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold">Walli Split</h2>
            {stats && (
              <p className="text-[0.68rem] text-warm mt-0.5">
                {stats.expenseCount} expenses · {stats.totalCZK.toLocaleString()} CZK (~{stats.totalSEK.toLocaleString()} SEK)
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg cursor-pointer">✕</button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[72px] z-10 bg-panel border-b border-stone-200 dark:border-stone-800 px-3 py-2 flex gap-1.5">
          {([["expenses", "📋 Expenses"], ["balances", "⚖️ Balances"], ["add", "＋ Add"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-full text-[0.68rem] font-semibold cursor-pointer transition-colors ${tab === t ? "bg-ink text-paper dark:bg-paper dark:text-ink" : "bg-stone-100 dark:bg-stone-800 text-warm"}`}
            >{label}</button>
          ))}
        </div>

        <div className="p-5">
          {loading && <div className="flex items-center gap-2 py-8 text-warm text-sm"><div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />Loading…</div>}

          {/* EXPENSES TAB */}
          {!loading && tab === "expenses" && (
            <div className="space-y-2">
              {expenses.length === 0 && (
                <div className="text-center py-12 text-warm">
                  <span className="text-5xl block mb-3">💸</span>
                  <p className="text-sm font-semibold">No expenses yet</p>
                  <p className="text-[0.72rem] mt-1">Tap <strong>+ Add</strong> to log your first expense</p>
                </div>
              )}
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-2xl">{catEmoji(e.category)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{e.description}</div>
                    <div className="text-[0.65rem] text-warm">
                      {e.paidBy} paid · {e.splits.length} people · {e.date}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-ink tabular-nums">{e.amount.toLocaleString()} {e.currency}</div>
                    <div className="text-[0.6rem] text-warm">{Math.round(e.amount / e.splits.length)} ea</div>
                  </div>
                </div>
              ))}
            </div>
          )}

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

              {/* Category breakdown */}
              {stats && Object.keys(stats.byCategory).length > 0 && (
                <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 mb-4">
                  <h3 className="text-[0.62rem] uppercase tracking-wider text-warm font-bold mb-3">By category</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, czk]) => (
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
                <h3 className="text-sm font-semibold text-ink">Add expense</h3>
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
        </div>
      </aside>
    </>
  );
}
