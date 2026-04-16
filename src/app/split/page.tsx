"use client";

import { useEffect, useState, useCallback } from "react";

// --- Types ---
interface Expense {
  id: string; description: string; amount: number; currency: "CZK" | "SEK";
  paidBy: string; splits: { name: string; share: number }[];
  category: string; date: string; createdAt: string;
}
interface Balance { from: string; to: string; amount: number }
interface Stats { totalCZK: number; totalSEK: number; expenseCount: number; people: string[]; byCategory: Record<string, number> }
interface Activity { type: string; text: string; time: string; emoji: string }

const CATS = [
  { id: "food", emoji: "🍽", label: "Food" },
  { id: "transport", emoji: "🚕", label: "Transport" },
  { id: "hotel", emoji: "🏨", label: "Hotel" },
  { id: "activity", emoji: "🎟", label: "Activity" },
  { id: "shopping", emoji: "🛍", label: "Shopping" },
  { id: "spa", emoji: "🧖", label: "Spa" },
  { id: "other", emoji: "💰", label: "Other" },
];

const PRESETS = [
  { label: "☕ Coffee", cat: "food", amt: 120 },
  { label: "🍺 Beer", cat: "food", amt: 70 },
  { label: "🍽 Dinner", cat: "food", amt: 800 },
  { label: "🥗 Lunch", cat: "food", amt: 400 },
  { label: "🚕 Taxi", cat: "transport", amt: 250 },
  { label: "🚇 Metro", cat: "transport", amt: 40 },
  { label: "🎟 Entry", cat: "activity", amt: 250 },
  { label: "🧖 Spa", cat: "spa", amt: 1500 },
];

function catEmoji(id: string) { return CATS.find(c => c.id === id)?.emoji || "💰"; }

// --- Setup screen (enter name, shown once) ---
function SetupScreen({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-6">💸</div>
        <h1 className="text-2xl font-bold mb-2">Walli Split</h1>
        <p className="text-stone-500 text-sm mb-8">Split expenses with your travel group</p>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          onKeyDown={e => e.key === "Enter" && name.trim() && onDone(name.trim())}
          className="w-full px-4 py-3 rounded-2xl bg-stone-50 border-2 border-stone-200 text-center text-lg font-medium outline-none focus:border-stone-900 transition-colors"
        />
        <button
          onClick={() => name.trim() && onDone(name.trim())}
          disabled={!name.trim()}
          className="w-full mt-4 py-3 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-30 cursor-pointer hover:bg-stone-800 transition-colors"
        >Continue</button>
      </div>
    </div>
  );
}

// --- Main app ---
type View = "home" | "add" | "balances" | "activity";

export default function SplitPage() {
  const [myName, setMyName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("split-name");
    if (saved) setMyName(saved);
    setLoaded(true);
  }, []);

  const handleSetup = (name: string) => {
    localStorage.setItem("split-name", name);
    setMyName(name);
  };

  if (!loaded) return null;
  if (!myName) return <SetupScreen onDone={handleSetup} />;
  return <SplitApp myName={myName} onChangeName={() => { localStorage.removeItem("split-name"); setMyName(null); }} />;
}

function SplitApp({ myName, onChangeName }: { myName: string; onChangeName: () => void }) {
  const [view, setView] = useState<View>("home");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Group members (persisted in localStorage)
  const [members, setMembers] = useState<string[]>(() => {
    if (typeof window === "undefined") return [myName];
    const saved = localStorage.getItem("split-members");
    return saved ? JSON.parse(saved) : [myName];
  });
  const [newMember, setNewMember] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  const saveMembers = (m: string[]) => {
    setMembers(m);
    localStorage.setItem("split-members", JSON.stringify(m));
  };
  const addMember = () => {
    const n = newMember.trim();
    if (n && !members.includes(n)) { saveMembers([...members, n]); setNewMember(""); }
  };

  // Add expense form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"CZK" | "SEK">("CZK");
  const [paidBy, setPaidBy] = useState(myName);
  const [splitWith, setSplitWith] = useState<string[]>(members);
  const [category, setCategory] = useState("food");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  // Settle
  const [settleTarget, setSettleTarget] = useState<Balance | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/split");
      if (res.ok) {
        const d = await res.json();
        setExpenses(d.expenses || []);
        setBalances(d.balances || []);
        setStats(d.stats || null);
        setActivity(d.activity || []);
        // Auto-add people from history
        const known = new Set(members);
        (d.stats?.people || []).forEach((p: string) => { if (!known.has(p)) known.add(p); });
        if (known.size > members.length) saveMembers(Array.from(known));
      }
    } catch { /* ok */ }
    setLoading(false);
  }, [members]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep splitWith in sync with members
  useEffect(() => { setSplitWith(members); }, [members]);

  const toggleSplit = (name: string) => {
    setSplitWith(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleAdd = async () => {
    if (!desc || !amount || !paidBy || splitWith.length === 0) return;
    setSubmitting(true);
    const amt = parseFloat(amount);
    const splits = splitWith.map(name => ({ name, share: Math.round(amt / splitWith.length * 100) / 100 }));
    try {
      await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, amount: amt, currency, paidBy, splits, category, createdBy: myName }),
      });
      setToast(`${catEmoji(category)} ${desc} — ${amt} ${currency}`);
      setDesc(""); setAmount(""); setView("home"); fetchData();
      setTimeout(() => setToast(""), 3000);
    } catch { /* ok */ }
    setSubmitting(false);
  };

  const handleSettle = async (b: Balance) => {
    try {
      await fetch("/api/split/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: b.from, to: b.to, amount: b.amount, currency: "CZK", method: "Swish" }),
      });
      setSettleTarget(null);
      setToast(`✅ ${b.from} → ${b.to}: ${b.amount} CZK settled`);
      fetchData();
      setTimeout(() => setToast(""), 3000);
    } catch { /* ok */ }
  };

  const myBalance = balances.reduce((sum, b) => {
    if (b.from === myName) return sum - b.amount;
    if (b.to === myName) return sum + b.amount;
    return sum;
  }, 0);

  return (
    <div className="max-w-lg mx-auto pb-24 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-stone-900 text-white text-sm font-medium shadow-xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Walli Split</h1>
            <p className="text-xs text-stone-400">
              {myName} · {members.length} people
              {stats && stats.expenseCount > 0 && ` · ${stats.totalCZK.toLocaleString()} CZK total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMembers(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm cursor-pointer hover:bg-stone-200 transition-colors" title="Group">👥</button>
            <a href="/" className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs cursor-pointer hover:bg-stone-200 transition-colors" title="Back to map">🗺</a>
          </div>
        </div>
      </header>

      {/* Balance card */}
      <div className="px-4 pt-4">
        <div className={`rounded-3xl p-5 ${myBalance >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
          <p className="text-xs font-medium text-stone-500 mb-1">Your balance</p>
          <p className={`text-3xl font-bold tabular-nums ${myBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {myBalance >= 0 ? "+" : ""}{Math.round(myBalance)} CZK
          </p>
          <p className="text-xs text-stone-400 mt-1">
            {myBalance > 0 ? "Others owe you" : myBalance < 0 ? "You owe others" : "All settled! 🎉"}
          </p>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" /></div>}

      {!loading && view === "home" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Debts */}
          {balances.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Settle up</h2>
              <div className="space-y-2">
                {balances.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">{b.from[0]}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.from} → {b.to}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{b.amount} CZK</p>
                    <button onClick={() => setSettleTarget(b)} className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold cursor-pointer hover:bg-emerald-600 transition-colors">Pay</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Recent</h2>
              {expenses.length > 5 && <button onClick={() => setView("activity")} className="text-xs text-stone-400 cursor-pointer">See all →</button>}
            </div>
            {expenses.length === 0 && (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🧾</p>
                <p className="text-sm font-medium text-stone-600 mb-1">No expenses yet</p>
                <p className="text-xs text-stone-400">Tap + to add your first one</p>
              </div>
            )}
            {expenses.slice(0, 8).map(e => (
              <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
                <span className="text-xl w-8 text-center">{catEmoji(e.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-[0.65rem] text-stone-400">{e.paidBy} · {e.splits.length}p · {new Date(e.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{e.amount} {e.currency}</p>
                  <p className="text-[0.6rem] text-stone-400">{Math.round(e.amount / e.splits.length)} ea</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          {stats && stats.expenseCount > 0 && (
            <button onClick={() => setView("balances")} className="w-full p-4 rounded-2xl bg-stone-50 text-left cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Trip total</span>
                <span className="text-xs text-stone-400">Details →</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-bold tabular-nums">{stats.totalCZK.toLocaleString()}</p>
                  <p className="text-[0.6rem] text-stone-400">CZK</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-stone-400">~{stats.totalSEK.toLocaleString()}</p>
                  <p className="text-[0.6rem] text-stone-400">SEK</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold tabular-nums">{stats.expenseCount}</p>
                  <p className="text-[0.6rem] text-stone-400">expenses</p>
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ADD VIEW */}
      {view === "add" && (
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setView("home")} className="text-sm text-stone-400 cursor-pointer">← Back</button>

          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Quick add</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setDesc(p.label.slice(2).trim()); setAmount(String(p.amt)); setCategory(p.cat); setCurrency("CZK"); }}
                  className="py-2.5 rounded-2xl bg-stone-50 text-center cursor-pointer hover:bg-stone-100 transition-colors">
                  <span className="text-xl block">{p.label.slice(0, 2)}</span>
                  <span className="text-[0.6rem] text-stone-500 block mt-0.5">{p.label.slice(2).trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What was it?" autoFocus
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border-2 border-transparent text-sm font-medium outline-none focus:border-stone-900 transition-colors" />

            <div className="flex gap-2">
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="flex-1 px-4 py-3 rounded-2xl bg-stone-50 border-2 border-transparent text-lg font-bold outline-none focus:border-stone-900 transition-colors tabular-nums" />
              <div className="flex rounded-2xl overflow-hidden border-2 border-stone-100">
                {(["CZK", "SEK"] as const).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={`px-4 py-3 text-sm font-semibold cursor-pointer transition-colors ${currency === c ? "bg-stone-900 text-white" : "bg-white text-stone-400"}`}>{c}</button>
                ))}
              </div>
            </div>

            {/* Who paid */}
            <div>
              <p className="text-xs font-semibold text-stone-400 mb-1.5">Who paid?</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button key={m} onClick={() => setPaidBy(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${paidBy === m ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                    {m}{m === myName ? " (me)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Split between */}
            <div>
              <p className="text-xs font-semibold text-stone-400 mb-1.5">Split between</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button key={m} onClick={() => toggleSplit(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${splitWith.includes(m) ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400 line-through"}`}>
                    {m}
                  </button>
                ))}
              </div>
              {splitWith.length > 0 && amount && (
                <p className="text-xs text-stone-400 mt-1.5">{Math.round(parseFloat(amount) / splitWith.length)} {currency} each</p>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${category === c.id ? "bg-stone-900 text-white" : "bg-stone-50 text-stone-500"}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <button onClick={handleAdd} disabled={submitting || !desc || !amount || splitWith.length === 0}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-semibold cursor-pointer hover:bg-stone-800 disabled:opacity-30 transition-colors">
              {submitting ? "Adding…" : "Add expense"}
            </button>
          </div>
        </div>
      )}

      {/* BALANCES VIEW */}
      {!loading && view === "balances" && stats && (
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setView("home")} className="text-sm text-stone-400 cursor-pointer">← Back</button>

          {/* Per person */}
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Per person paid</h2>
            {(() => {
              const paid: Record<string, number> = {};
              expenses.forEach(e => {
                const czk = e.currency === "SEK" ? e.amount * 2.35 : e.amount;
                paid[e.paidBy] = (paid[e.paidBy] || 0) + czk;
              });
              const max = Math.max(...Object.values(paid), 1);
              return (
                <div className="space-y-2">
                  {Object.entries(paid).sort((a, b) => b[1] - a[1]).map(([name, czk]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600">{name[0]}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium">{name}</span>
                          <span className="font-semibold tabular-nums">{Math.round(czk).toLocaleString()} CZK</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                          <div className="h-full rounded-full bg-stone-900 transition-all" style={{ width: `${(czk / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Category breakdown */}
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">By category</h2>
            <div className="space-y-2">
              {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, czk]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{catEmoji(cat)}</span>
                  <span className="text-sm font-medium flex-1">{CATS.find(c => c.id === cat)?.label || cat}</span>
                  <span className="text-sm font-semibold tabular-nums">{Math.round(czk).toLocaleString()} CZK</span>
                  <span className="text-xs text-stone-400 w-10 text-right">{Math.round((czk / stats.totalCZK) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-2">
            <button onClick={() => {
              const csv = "Date,Description,Amount,Currency,PaidBy,Category\n" + expenses.map(e => `${e.date},"${e.description}",${e.amount},${e.currency},${e.paidBy},${e.category}`).join("\n");
              const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "walli-split.csv"; a.click();
            }} className="flex-1 py-2.5 rounded-2xl bg-stone-100 text-sm font-medium text-stone-600 cursor-pointer hover:bg-stone-200 transition-colors">📊 Export CSV</button>
            <button onClick={() => {
              const t = `💸 Walli Split\n💰 ${stats.totalCZK.toLocaleString()} CZK (~${stats.totalSEK.toLocaleString()} SEK)\n👥 ${stats.people.length} people · ${stats.expenseCount} expenses`;
              navigator.share ? navigator.share({ text: t }) : navigator.clipboard.writeText(t);
            }} className="flex-1 py-2.5 rounded-2xl bg-stone-100 text-sm font-medium text-stone-600 cursor-pointer hover:bg-stone-200 transition-colors">📤 Share</button>
          </div>
        </div>
      )}

      {/* ACTIVITY VIEW */}
      {!loading && view === "activity" && (
        <div className="px-4 pt-4">
          <button onClick={() => setView("home")} className="text-sm text-stone-400 cursor-pointer mb-3">← Back</button>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">All activity</h2>
          {activity.map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-stone-50 last:border-0">
              <span className="text-lg mt-0.5">{a.emoji}</span>
              <div>
                <p className="text-sm">{a.text}</p>
                <p className="text-[0.6rem] text-stone-400">{new Date(a.time).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settle confirm */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setSettleTarget(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Settle up</h3>
            <p className="text-sm text-stone-500 mb-4">{settleTarget.from} pays {settleTarget.to}</p>
            <div className="text-3xl font-bold text-center py-4 tabular-nums">{settleTarget.amount} CZK</div>
            <button onClick={() => handleSettle(settleTarget)} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold cursor-pointer hover:bg-emerald-600 transition-colors">Confirm payment</button>
            <button onClick={() => setSettleTarget(null)} className="w-full py-2.5 mt-2 text-sm text-stone-400 cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* Members sheet */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Group members</h3>
            <div className="space-y-2 mb-4">
              {members.map(m => (
                <div key={m} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold">{m[0]}</div>
                  <span className="text-sm font-medium flex-1">{m}{m === myName ? " (you)" : ""}</span>
                  {m !== myName && (
                    <button onClick={() => saveMembers(members.filter(x => x !== m))} className="text-xs text-red-400 cursor-pointer">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Add person…"
                onKeyDown={e => e.key === "Enter" && addMember()}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 text-sm outline-none border-2 border-transparent focus:border-stone-900" />
              <button onClick={addMember} disabled={!newMember.trim()} className="px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-30">Add</button>
            </div>
            <button onClick={onChangeName} className="w-full mt-4 py-2 text-xs text-stone-400 cursor-pointer">Change my name</button>
            <button onClick={() => setShowMembers(false)} className="w-full py-2 text-sm text-stone-400 cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-100 max-w-lg mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch">
          <button onClick={() => setView("home")} className={`flex-1 py-3 flex flex-col items-center gap-0.5 cursor-pointer ${view === "home" ? "text-stone-900" : "text-stone-300"}`}>
            <span className="text-lg">🏠</span><span className="text-[0.55rem] font-semibold">Home</span>
          </button>
          <button onClick={() => setView("balances")} className={`flex-1 py-3 flex flex-col items-center gap-0.5 cursor-pointer ${view === "balances" ? "text-stone-900" : "text-stone-300"}`}>
            <span className="text-lg">📊</span><span className="text-[0.55rem] font-semibold">Stats</span>
          </button>
          <button onClick={() => setView("add")} className="flex-1 py-2 flex items-center justify-center cursor-pointer">
            <span className="w-12 h-12 rounded-full bg-stone-900 text-white text-2xl flex items-center justify-center shadow-lg -mt-5">+</span>
          </button>
          <button onClick={() => setView("activity")} className={`flex-1 py-3 flex flex-col items-center gap-0.5 cursor-pointer ${view === "activity" ? "text-stone-900" : "text-stone-300"}`}>
            <span className="text-lg">🔔</span><span className="text-[0.55rem] font-semibold">Feed</span>
          </button>
          <button onClick={() => setShowMembers(true)} className="flex-1 py-3 flex flex-col items-center gap-0.5 cursor-pointer text-stone-300">
            <span className="text-lg">👥</span><span className="text-[0.55rem] font-semibold">Group</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
