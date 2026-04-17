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
interface User { phone: string; name: string; color: string; avatar: string; createdAt: string; deleted?: boolean }

type Env = "prod" | "test";

// --- Env handling ---
function getEnv(): Env {
  if (typeof window === "undefined") return "prod";
  const url = new URL(window.location.href);
  const q = url.searchParams.get("env");
  if (q === "test" || q === "prod") return q;
  return (localStorage.getItem("split-env") as Env) || "prod";
}

function apiUrl(path: string, env: Env): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}env=${env}`;
}

function storageKey(env: Env, key: string): string {
  return env === "test" ? `split-test-${key}` : `split-${key}`;
}

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

// --- Setup screen (enter name + phone, shown once) ---
function SetupScreen({ env, onDone }: { env: Env; onDone: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim().length >= 2 && phone.replace(/[^\d+]/g, "").length >= 6;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setError("");
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    try {
      const res = await fetch(apiUrl("/api/users", env), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, phone: cleanPhone }),
      });
      if (res.ok) {
        onDone(cleanName, cleanPhone);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to register");
      }
    } catch { setError("Network error"); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="text-6xl mb-6">💸</div>
          <h1 className="text-2xl font-bold mb-2">Walli Split</h1>
          <p className="text-stone-500 text-sm mb-8">Split expenses with your travel group</p>
        </div>
        {env === "test" && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <p className="text-[0.65rem] font-bold text-amber-800 uppercase tracking-wider">🧪 Test mode</p>
            <p className="text-[0.65rem] text-amber-700 mt-0.5">Data can be reset anytime</p>
          </div>
        )}
        <div className="space-y-3">
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border-2 border-stone-200 text-lg font-medium outline-none focus:border-stone-900 transition-colors"
          />
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Your phone (e.g. +46701234567)"
            onKeyDown={e => e.key === "Enter" && canSubmit && submit()}
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border-2 border-stone-200 text-lg font-medium outline-none focus:border-stone-900 transition-colors"
          />
          <p className="text-xs text-stone-400 leading-relaxed">
            Phone is used for Swish payments. Stays saved so you don&apos;t have to type it again.
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-30 cursor-pointer hover:bg-stone-800 transition-colors"
          >{submitting ? "Registering…" : "Continue"}</button>
        </div>
      </div>
    </div>
  );
}

// --- Main app ---
type View = "home" | "add" | "balances" | "activity";

export default function SplitPage() {
  const [env, setEnv] = useState<Env>("prod");
  const [myName, setMyName] = useState<string | null>(null);
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const e = getEnv();
    setEnv(e);
    localStorage.setItem("split-env", e);
    const savedName = localStorage.getItem(storageKey(e, "name"));
    const savedPhone = localStorage.getItem(storageKey(e, "phone"));
    if (savedName) setMyName(savedName);
    if (savedPhone) setMyPhone(savedPhone);
    setLoaded(true);
  }, []);

  const handleSetup = (name: string, phone: string) => {
    localStorage.setItem(storageKey(env, "name"), name);
    localStorage.setItem(storageKey(env, "phone"), phone);
    setMyName(name);
    setMyPhone(phone);
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKey(env, "name"));
    localStorage.removeItem(storageKey(env, "phone"));
    setMyName(null);
    setMyPhone(null);
  };

  const switchEnv = (newEnv: Env) => {
    localStorage.setItem("split-env", newEnv);
    const url = new URL(window.location.href);
    url.searchParams.set("env", newEnv);
    window.location.href = url.toString();
  };

  if (!loaded) return null;
  if (!myName || !myPhone) return <SetupScreen env={env} onDone={handleSetup} />;
  return (
    <SplitApp
      env={env}
      myName={myName}
      myPhone={myPhone}
      onLogout={handleLogout}
      onSwitchEnv={switchEnv}
    />
  );
}

function SplitApp({
  env, myName, myPhone, onLogout, onSwitchEnv,
}: {
  env: Env;
  myName: string;
  myPhone: string;
  onLogout: () => void;
  onSwitchEnv: (e: Env) => void;
}) {
  const [view, setView] = useState<View>("home");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Group members (merged from registered users + local additions)
  const [localMembers, setLocalMembers] = useState<string[]>(() => {
    if (typeof window === "undefined") return [myName];
    const saved = localStorage.getItem(storageKey(env, "members"));
    return saved ? JSON.parse(saved) : [myName];
  });
  const [newMember, setNewMember] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  // Computed members list: merge registered users + local additions + me
  const members = Array.from(new Set([
    myName,
    ...registeredUsers.map(u => u.name),
    ...localMembers,
  ]));

  const saveLocalMembers = (m: string[]) => {
    setLocalMembers(m);
    localStorage.setItem(storageKey(env, "members"), JSON.stringify(m));
  };
  const addMember = () => {
    const n = newMember.trim();
    if (n && !members.includes(n)) { saveLocalMembers([...localMembers, n]); setNewMember(""); }
  };
  const removeLocalMember = (name: string) => {
    saveLocalMembers(localMembers.filter(m => m !== name));
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
      // Parallel fetch: split data + registered users
      const [splitRes, usersRes] = await Promise.all([
        fetch(apiUrl("/api/split", env), { cache: "no-store" }),
        fetch(apiUrl("/api/users", env), { cache: "no-store" }),
      ]);
      if (splitRes.ok) {
        const d = await splitRes.json();
        setExpenses(d.expenses || []);
        setBalances(d.balances || []);
        setStats(d.stats || null);
        setActivity(d.activity || []);
        // Auto-add people from history to local members
        const known = new Set(localMembers);
        known.add(myName);
        (d.stats?.people || []).forEach((p: string) => known.add(p));
        if (known.size > localMembers.length) {
          saveLocalMembers(Array.from(known));
        }
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setRegisteredUsers(u.users || []);
      }
    } catch { /* ok */ }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, myName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep splitWith in sync with members (but only on initial or when members change dramatically)
  useEffect(() => {
    setSplitWith(prev => {
      const prevSet = new Set(prev);
      return members.filter(m => prevSet.has(m) || prev.length === 0);
    });
    if (paidBy === "" || !members.includes(paidBy)) {
      setPaidBy(myName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.join(",")]);

  const toggleSplit = (name: string) => {
    setSplitWith(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleAdd = async () => {
    if (!desc || !amount || !paidBy || splitWith.length === 0) return;
    setSubmitting(true);
    const amt = parseFloat(amount);
    const splits = splitWith.map(name => ({ name, share: Math.round(amt / splitWith.length * 100) / 100 }));
    try {
      await fetch(apiUrl("/api/split", env), {
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
      await fetch(apiUrl("/api/split/settle", env), {
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

  const handleReset = async () => {
    if (env !== "test") return;
    if (!confirm("Reset ALL test data? This deletes all expenses, settlements and users in test mode.")) return;
    setResetting(true);
    try {
      const res = await fetch(apiUrl("/api/split/reset", env), { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setToast(`✅ Test data reset (${d.deleted} items)`);
        localStorage.removeItem(storageKey(env, "members"));
        setExpenses([]); setBalances([]); setStats(null); setActivity([]); setRegisteredUsers([]);
        setTimeout(() => setToast(""), 3000);
      }
    } catch { /* ok */ }
    setResetting(false);
    setShowSettings(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm(`Delete your account (${myName})? You'll be removed from the group.`)) return;
    try {
      await fetch(apiUrl("/api/users", env), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: myPhone }),
      });
      onLogout();
    } catch { /* ok */ }
  };

  const myBalance = balances.reduce((sum, b) => {
    if (b.from === myName) return sum - b.amount;
    if (b.to === myName) return sum + b.amount;
    return sum;
  }, 0);

  return (
    <div className="max-w-lg mx-auto pb-24 relative">
      {/* Test mode banner */}
      {env === "test" && (
        <div className="sticky top-0 z-50 bg-amber-100 border-b-2 border-amber-300 px-4 py-1.5 flex items-center justify-between">
          <span className="text-[0.65rem] font-bold text-amber-900 uppercase tracking-wider">🧪 Test mode</span>
          <button onClick={() => onSwitchEnv("prod")} className="text-[0.65rem] font-semibold text-amber-900 underline cursor-pointer">Switch to PROD</button>
        </div>
      )}
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
            <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm cursor-pointer hover:bg-stone-200 transition-colors" title="Settings">⚙</button>
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
      {settleTarget && (() => {
        const recipient = registeredUsers.find(u => u.name === settleTarget.to);
        const amountSEK = Math.round(settleTarget.amount / 2.35);
        const swishUrl = recipient?.phone
          ? `https://app.swish.nu/1/p/sw/?sw=${recipient.phone.replace(/\D/g, "")}&amt=${amountSEK}&msg=${encodeURIComponent(`Walli Split`)}&src=qr`
          : null;
        return (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setSettleTarget(null)}>
            <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1">Settle up</h3>
              <p className="text-sm text-stone-500 mb-4">{settleTarget.from} pays {settleTarget.to}</p>
              <div className="text-center py-4">
                <div className="text-3xl font-bold tabular-nums">{settleTarget.amount} CZK</div>
                <div className="text-xs text-stone-400">~{amountSEK} SEK</div>
              </div>
              {swishUrl && (
                <a href={swishUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full py-3.5 mb-2 rounded-2xl bg-purple-600 text-white text-sm font-semibold cursor-pointer hover:bg-purple-700 transition-colors text-center"
                >💸 Pay with Swish ({amountSEK} SEK)</a>
              )}
              {!swishUrl && recipient === undefined && (
                <p className="text-xs text-stone-400 text-center mb-2">No Swish number found for {settleTarget.to}. Ask them to register.</p>
              )}
              <button onClick={() => handleSettle(settleTarget)} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold cursor-pointer hover:bg-emerald-600 transition-colors">
                {swishUrl ? "Mark as paid (after Swish)" : "Confirm payment"}
              </button>
              <button onClick={() => setSettleTarget(null)} className="w-full py-2.5 mt-2 text-sm text-stone-400 cursor-pointer">Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* Settings sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Settings</h3>

            {/* My info */}
            <div className="p-3 rounded-2xl bg-stone-50 mb-4">
              <p className="text-xs text-stone-400 mb-0.5">Logged in as</p>
              <p className="text-sm font-semibold">{myName}</p>
              <p className="text-xs text-stone-500">{myPhone}</p>
            </div>

            {/* Environment switcher */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Environment</p>
              <div className="flex gap-2">
                <button onClick={() => onSwitchEnv("prod")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${env === "prod" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"}`}>
                  🚀 Production
                </button>
                <button onClick={() => onSwitchEnv("test")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${env === "test" ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-500"}`}>
                  🧪 Test
                </button>
              </div>
              <p className="text-xs text-stone-400 mt-1.5">
                {env === "test"
                  ? "Test data is isolated from prod. You can reset it anytime."
                  : "Real data. Be careful."}
              </p>
            </div>

            {/* Test reset (only shown in test mode) */}
            {env === "test" && (
              <button onClick={handleReset} disabled={resetting}
                className="w-full py-3 rounded-2xl bg-red-50 text-red-700 border-2 border-red-200 text-sm font-semibold cursor-pointer hover:bg-red-100 transition-colors mb-2 disabled:opacity-40">
                {resetting ? "Resetting…" : "🗑 Reset ALL test data"}
              </button>
            )}

            {/* Logout */}
            <button onClick={onLogout}
              className="w-full py-2.5 rounded-2xl bg-stone-100 text-stone-700 text-sm font-medium cursor-pointer hover:bg-stone-200 transition-colors mb-2">
              Logout (keep data)
            </button>

            {/* Delete account */}
            <button onClick={handleDeleteAccount}
              className="w-full py-2.5 rounded-2xl text-red-500 text-sm font-medium cursor-pointer hover:bg-red-50 transition-colors mb-2">
              Delete my account
            </button>

            <button onClick={() => setShowSettings(false)} className="w-full py-2 text-sm text-stone-400 cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Members sheet */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Group members</h3>
            <p className="text-xs text-stone-400 mb-3">Registered users (📱) can receive Swish payments</p>
            <div className="space-y-2 mb-4">
              {members.map(m => {
                const registered = registeredUsers.find(u => u.name === m);
                return (
                  <div key={m} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: registered?.color || "#a8a29e" }}>
                      {m[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {m}{m === myName ? " (you)" : ""}
                        {registered && <span className="text-[0.6rem]">📱</span>}
                      </div>
                      {registered && <div className="text-[0.65rem] text-stone-400">{registered.phone}</div>}
                    </div>
                    {m !== myName && !registered && (
                      <button onClick={() => removeLocalMember(m)} className="text-xs text-red-400 cursor-pointer">Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Add person (name only)…"
                onKeyDown={e => e.key === "Enter" && addMember()}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 text-sm outline-none border-2 border-transparent focus:border-stone-900" />
              <button onClick={addMember} disabled={!newMember.trim()} className="px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-30">Add</button>
            </div>
            <p className="text-[0.65rem] text-stone-400 mt-2">Ask them to register via this link to enable Swish.</p>
            <button onClick={() => setShowMembers(false)} className="w-full py-2 mt-4 text-sm text-stone-400 cursor-pointer">Close</button>
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
