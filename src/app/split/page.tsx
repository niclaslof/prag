"use client";

import { useEffect, useState, useCallback, useRef } from "react";

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
interface Group { id: string; name: string; emoji: string; createdBy: string; createdAt: string; memberPhones: string[] }

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
function SetupScreen({ env, onDone, pendingGroupId }: { env: Env; onDone: (name: string, phone: string) => void; pendingGroupId: string | null }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingUsers, setExistingUsers] = useState<{ name: string; color: string }[]>([]);
  const [invitingGroup, setInvitingGroup] = useState<{ name: string; emoji: string; memberCount: number } | null>(null);

  // Fetch existing users + group info if invited
  useEffect(() => {
    fetch(apiUrl("/api/users", env)).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.users?.length) setExistingUsers(d.users);
    }).catch(() => {});

    if (pendingGroupId) {
      fetch(apiUrl("/api/groups", env)).then(r => r.ok ? r.json() : null).then(d => {
        const g = d?.groups?.find((x: Group) => x.id === pendingGroupId);
        if (g) setInvitingGroup({ name: g.name, emoji: g.emoji, memberCount: g.memberPhones.length });
      }).catch(() => {});
    }
  }, [env, pendingGroupId]);

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
        {invitingGroup ? (
          <div className="text-center">
            <div className="text-6xl mb-6">{invitingGroup.emoji}</div>
            <p className="text-xs text-stone-400 uppercase tracking-[0.2em] mb-2">You were invited to</p>
            <h1 className="text-2xl font-bold mb-2">{invitingGroup.name}</h1>
            <p className="text-stone-500 text-sm mb-8">{invitingGroup.memberCount} {invitingGroup.memberCount === 1 ? "member" : "members"} · Register to join</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-6">💸</div>
            <h1 className="text-2xl font-bold mb-2">Walli Split</h1>
            <p className="text-stone-500 text-sm mb-8">
              {existingUsers.length > 0
                ? `Join ${existingUsers.length} ${existingUsers.length === 1 ? "person" : "people"} already tracking expenses`
                : "Split expenses with your travel group"}
            </p>
          </div>
        )}
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

  const [pendingJoinGroupId, setPendingJoinGroupId] = useState<string | null>(null);

  useEffect(() => {
    const e = getEnv();
    setEnv(e);
    localStorage.setItem("split-env", e);
    const savedName = localStorage.getItem(storageKey(e, "name"));
    const savedPhone = localStorage.getItem(storageKey(e, "phone"));
    if (savedName) setMyName(savedName);
    if (savedPhone) setMyPhone(savedPhone);

    // Check URL for ?join=<groupId>
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get("join");
    if (joinId) {
      setPendingJoinGroupId(joinId);
      // If already logged in, join immediately
      if (savedPhone) {
        fetch(apiUrl("/api/groups", e), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: joinId, phone: savedPhone }),
        }).then(() => {
          localStorage.setItem(storageKey(e, "groupId"), joinId);
          // Clean URL
          window.history.replaceState(null, "", window.location.pathname);
        }).catch(() => {});
      }
    }

    setLoaded(true);
  }, []);

  const handleSetup = async (name: string, phone: string) => {
    localStorage.setItem(storageKey(env, "name"), name);
    localStorage.setItem(storageKey(env, "phone"), phone);
    setMyName(name);
    setMyPhone(phone);

    // If they arrived via invite link, auto-join the group
    if (pendingJoinGroupId) {
      try {
        await fetch(apiUrl("/api/groups", env), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: pendingJoinGroupId, phone }),
        });
        localStorage.setItem(storageKey(env, "groupId"), pendingJoinGroupId);
        window.history.replaceState(null, "", window.location.pathname);
      } catch { /* ok */ }
      setPendingJoinGroupId(null);
    }
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
  if (!myName || !myPhone) return <SetupScreen env={env} onDone={handleSetup} pendingGroupId={pendingJoinGroupId} />;
  return (
    <SplitApp
      env={env}
      myName={myName}
      myPhone={myPhone}
      onLogout={handleLogout}
      onSwitchEnv={switchEnv}
      key={env + myPhone}
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string>(() => {
    if (typeof window === "undefined") return "walliprag";
    return localStorage.getItem(storageKey(env, "groupId")) || "walliprag";
  });
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [resetting, setResetting] = useState(false);

  const currentGroup = groups.find(g => g.id === currentGroupId);
  const selectGroup = (id: string) => {
    setCurrentGroupId(id);
    localStorage.setItem(storageKey(env, "groupId"), id);
    setShowGroupSwitcher(false);
    setExpenses([]); setBalances([]); setStats(null); setActivity([]);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(apiUrl("/api/groups", env), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), createdBy: myName, creatorPhone: myPhone }),
      });
      if (res.ok) {
        const d = await res.json();
        setGroups(prev => [d.group, ...prev]);
        selectGroup(d.group.id);
        setNewGroupName("");
      }
    } catch { /* ok */ }
  };

  // Group members (merged from registered users + local additions)
  const [localMembers, setLocalMembers] = useState<string[]>(() => {
    if (typeof window === "undefined") return [myName];
    const saved = localStorage.getItem(storageKey(env, "members"));
    return saved ? JSON.parse(saved) : [myName];
  });
  const [newMember, setNewMember] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  // Computed members list: merge registered + local + me, prefer canonical name
  // If local "tommy" and registered "Tommy" exist, use the registered version (dedupes case-insensitively)
  const members = (() => {
    const seen = new Map<string, string>(); // lowercase → canonical
    // Registered users first (they are the source of truth)
    registeredUsers.forEach(u => { seen.set(u.name.toLowerCase(), u.name); });
    // Then me + local additions (only if not already registered)
    [myName, ...localMembers].forEach(n => {
      const key = n.toLowerCase();
      if (!seen.has(key)) seen.set(key, n);
    });
    return Array.from(seen.values());
  })();

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

  // Contact import via Web Contact Picker API (Chrome Android)
  const [importStatus, setImportStatus] = useState("");
  const canImportContacts = typeof window !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window;

  const importContacts = async () => {
    if (!canImportContacts) {
      setImportStatus("Your browser doesn't support contact import. Only works on Chrome for Android. Add manually instead.");
      setTimeout(() => setImportStatus(""), 5000);
      return;
    }
    try {
      const props = ["name", "tel"];
      // @ts-expect-error — Contact Picker API not in TS lib yet
      const contacts = await navigator.contacts.select(props, { multiple: true });
      const added: string[] = [];
      for (const c of contacts) {
        const name = (c.name?.[0] || "").trim();
        const phone = (c.tel?.[0] || "").replace(/[^\d+]/g, "");
        if (!name) continue;
        if (phone) {
          // Register the contact with phone — they become a real group member
          await fetch(apiUrl("/api/users", env), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone }),
          });
        } else {
          // Name only — add as local member
          if (!localMembers.includes(name)) localMembers.push(name);
        }
        added.push(name);
      }
      saveLocalMembers([...localMembers]);
      fetchData();
      setImportStatus(`✅ Added ${added.length} contacts`);
      setTimeout(() => setImportStatus(""), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes("cancel")) {
        setImportStatus(`Import failed: ${msg}`);
        setTimeout(() => setImportStatus(""), 5000);
      }
    }
  };

  // --- Universal contact import (works on ALL browsers) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [pasteText, setPasteText] = useState("");

  /** Parse vCard (.vcf) file content → array of {name, phone} */
  const parseVCard = (text: string): { name: string; phone: string }[] => {
    const contacts: { name: string; phone: string }[] = [];
    const cards = text.split("BEGIN:VCARD");
    for (const card of cards) {
      let name = "";
      let phone = "";
      for (const line of card.split("\n")) {
        const l = line.trim();
        if (l.startsWith("FN:")) name = l.slice(3).trim();
        if (l.startsWith("FN;")) name = l.split(":").slice(1).join(":").trim();
        if (l.startsWith("TEL") && l.includes(":")) {
          phone = l.split(":").slice(1).join(":").replace(/[^\d+]/g, "").trim();
        }
      }
      if (name && phone) contacts.push({ name, phone });
      else if (name) contacts.push({ name, phone: "" });
    }
    return contacts;
  };

  /** Parse CSV/text: "name, phone" per line */
  const parseText = (text: string): { name: string; phone: string }[] => {
    return text.split("\n").map(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      const name = parts[0] || "";
      const phone = (parts[1] || "").replace(/[^\d+]/g, "");
      return { name, phone };
    }).filter(c => c.name.length >= 2);
  };

  const handleFileImport = async (file: File) => {
    const text = await file.text();
    const contacts = file.name.endsWith(".vcf") ? parseVCard(text) : parseText(text);
    await addImportedContacts(contacts);
  };

  const addImportedContacts = async (contacts: { name: string; phone: string }[]) => {
    let added = 0;
    for (const c of contacts) {
      if (c.phone && c.phone.length >= 6) {
        await fetch(apiUrl("/api/users", env), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: c.name, phone: c.phone }),
        });
        added++;
      } else if (c.name && !localMembers.includes(c.name)) {
        localMembers.push(c.name);
      }
    }
    saveLocalMembers([...localMembers]);
    fetchData();
    setShowImportSheet(false);
    setPasteText("");
    setToast(`Added ${contacts.length} contacts (${added} with phone)`);
    setTimeout(() => setToast(""), 3000);
  };

  // Add registered member by phone (for "I know Tommy's number")
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const quickAddRegistered = async () => {
    if (!quickAddName.trim() || !quickAddPhone.trim()) return;
    try {
      const res = await fetch(apiUrl("/api/users", env), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickAddName.trim(), phone: quickAddPhone.trim() }),
      });
      if (res.ok) {
        setQuickAddName(""); setQuickAddPhone("");
        fetchData();
        setToast("✅ Added with Swish");
        setTimeout(() => setToast(""), 2000);
      }
    } catch { /* ok */ }
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
  const [splitMode, setSplitMode] = useState<"equal" | "items">("equal");
  const [items, setItems] = useState<{ name: string; price: string; assignedTo: string[] }[]>([]);

  // Settle
  const [settleTarget, setSettleTarget] = useState<Balance | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch
      const [splitRes, usersRes, groupsRes] = await Promise.all([
        fetch(apiUrl(`/api/split?group=${encodeURIComponent(currentGroupId)}`, env), { cache: "no-store" }),
        fetch(apiUrl("/api/users", env), { cache: "no-store" }),
        fetch(apiUrl("/api/groups", env), { cache: "no-store" }),
      ]);
      if (splitRes.ok) {
        const d = await splitRes.json();
        setExpenses(d.expenses || []);
        setBalances(d.balances || []);
        setStats(d.stats || null);
        setActivity(d.activity || []);
        const known = new Set(localMembers);
        known.add(myName);
        (d.stats?.people || []).forEach((p: string) => known.add(p));
        if (known.size > localMembers.length) saveLocalMembers(Array.from(known));
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setRegisteredUsers(u.users || []);
      }
      if (groupsRes.ok) {
        const g = await groupsRes.json();
        setGroups(g.groups || []);
      }
    } catch { /* ok */ }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, myName, currentGroupId]);

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
    if (!desc || !paidBy) return;

    let amt: number;
    let splits: { name: string; share: number }[];

    if (splitMode === "items") {
      // Itemized: each item has a price assigned to N people
      const validItems = items.filter(i => i.name.trim() && parseFloat(i.price) > 0 && i.assignedTo.length > 0);
      if (validItems.length === 0) return;
      amt = validItems.reduce((sum, i) => sum + parseFloat(i.price), 0);
      // Per-person share = sum of their assigned items
      const shares: Record<string, number> = {};
      for (const item of validItems) {
        const per = parseFloat(item.price) / item.assignedTo.length;
        for (const person of item.assignedTo) {
          shares[person] = (shares[person] || 0) + per;
        }
      }
      splits = Object.entries(shares).map(([name, share]) => ({
        name, share: Math.round(share * 100) / 100,
      }));
    } else {
      if (!amount || splitWith.length === 0) return;
      amt = parseFloat(amount);
      splits = splitWith.map(name => ({ name, share: Math.round(amt / splitWith.length * 100) / 100 }));
    }

    setSubmitting(true);
    try {
      await fetch(apiUrl(`/api/split?group=${encodeURIComponent(currentGroupId)}`, env), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, amount: amt, currency, paidBy, splits, category, createdBy: myName }),
      });
      setToast(`${catEmoji(category)} ${desc} — ${amt} ${currency}`);
      setDesc(""); setAmount(""); setItems([]); setSplitMode("equal"); setView("home"); fetchData();
      setTimeout(() => setToast(""), 3000);
    } catch { /* ok */ }
    setSubmitting(false);
  };

  const handleSettle = async (b: Balance) => {
    try {
      await fetch(apiUrl(`/api/split/settle?group=${encodeURIComponent(currentGroupId)}`, env), {
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
    if (!confirm("Reset ALL test data?\n\nThis deletes EVERYTHING in test mode:\n• All expenses and settlements\n• All registered users (including you)\n• All group members\n\nYou will be logged out.")) return;
    setResetting(true);
    try {
      const res = await fetch(apiUrl("/api/split/reset", env), { method: "POST" });
      if (res.ok) {
        // Clear all test-mode localStorage
        localStorage.removeItem(storageKey(env, "members"));
        localStorage.removeItem(storageKey(env, "name"));
        localStorage.removeItem(storageKey(env, "phone"));
        setExpenses([]); setBalances([]); setStats(null); setActivity([]); setRegisteredUsers([]);
        // Force full logout → back to setup screen
        onLogout();
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
          <button onClick={() => setShowGroupSwitcher(true)} className="flex-1 min-w-0 text-left cursor-pointer">
            <h1 className="text-lg font-bold flex items-center gap-1.5 truncate">
              {currentGroup ? (
                <>
                  <span>{currentGroup.emoji}</span>
                  <span className="truncate">{currentGroup.name}</span>
                </>
              ) : (
                "Walli Split"
              )}
              <span className="text-xs text-stone-400 ml-1">▾</span>
            </h1>
            <p className="text-xs text-stone-400">
              {myName} · {members.length} people
              {stats && stats.expenseCount > 0 && ` · ${stats.totalCZK.toLocaleString()} CZK`}
            </p>
          </button>
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
              {splitMode === "equal" ? (
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="flex-1 px-4 py-3 rounded-2xl bg-stone-50 border-2 border-transparent text-lg font-bold outline-none focus:border-stone-900 transition-colors tabular-nums" />
              ) : (
                <div className="flex-1 px-4 py-3 rounded-2xl bg-stone-50 text-lg font-bold tabular-nums text-stone-400">
                  {items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(0) || "0"}
                </div>
              )}
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

            {/* Split mode toggle */}
            <div className="flex gap-1 p-1 rounded-full bg-stone-100">
              <button onClick={() => setSplitMode("equal")}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${splitMode === "equal" ? "bg-white shadow-sm text-stone-900" : "text-stone-500"}`}>
                ÷ Equal
              </button>
              <button onClick={() => setSplitMode("items")}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${splitMode === "items" ? "bg-white shadow-sm text-stone-900" : "text-stone-500"}`}>
                🧾 By item
              </button>
            </div>

            {splitMode === "equal" && (
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
            )}

            {splitMode === "items" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-stone-400">Items</p>
                {items.map((item, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-stone-50 space-y-2">
                    <div className="flex gap-2">
                      <input type="text" value={item.name}
                        onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                        placeholder="Item (e.g. Pizza)"
                        className="flex-1 px-3 py-2 rounded-xl bg-white text-sm outline-none border-2 border-transparent focus:border-stone-900" />
                      <input type="number" inputMode="decimal" value={item.price}
                        onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, price: e.target.value } : it))}
                        placeholder="0"
                        className="w-20 px-3 py-2 rounded-xl bg-white text-sm outline-none border-2 border-transparent focus:border-stone-900 tabular-nums" />
                      <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="px-2 text-red-400 cursor-pointer">✕</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => (
                        <button key={m}
                          onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? {
                            ...it,
                            assignedTo: it.assignedTo.includes(m)
                              ? it.assignedTo.filter(x => x !== m)
                              : [...it.assignedTo, m],
                          } : it))}
                          className={`px-2 py-1 rounded-full text-[0.62rem] font-medium cursor-pointer transition-colors ${item.assignedTo.includes(m) ? "bg-stone-900 text-white" : "bg-white text-stone-400 border border-stone-200"}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    {item.assignedTo.length > 0 && parseFloat(item.price) > 0 && (
                      <p className="text-[0.62rem] text-stone-400">
                        {Math.round(parseFloat(item.price) / item.assignedTo.length)} {currency} each
                      </p>
                    )}
                  </div>
                ))}
                <button onClick={() => setItems(prev => [...prev, { name: "", price: "", assignedTo: [] }])}
                  className="w-full py-2 rounded-2xl bg-stone-100 text-stone-600 text-sm font-medium cursor-pointer hover:bg-stone-200 transition-colors">
                  + Add item
                </button>
                {items.length > 0 && (
                  <p className="text-xs text-stone-500 text-right">
                    Total: {items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(0)} {currency}
                  </p>
                )}
              </div>
            )}

            {/* Category */}
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${category === c.id ? "bg-stone-900 text-white" : "bg-stone-50 text-stone-500"}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <button onClick={handleAdd} disabled={
              submitting || !desc || (
                splitMode === "equal"
                  ? (!amount || splitWith.length === 0)
                  : items.filter(i => i.name.trim() && parseFloat(i.price) > 0 && i.assignedTo.length > 0).length === 0
              )
            }
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

      {/* Import contacts sheet (universal — works on ALL browsers) */}
      {showImportSheet && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowImportSheet(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Import contacts</h3>
            <p className="text-xs text-stone-400 mb-4">Choose how to add people to the group</p>

            <div className="space-y-2">
              {/* Method 1: Native contact picker (Chrome Android only) */}
              {canImportContacts && (
                <button onClick={() => { setShowImportSheet(false); importContacts(); }}
                  className="w-full text-left p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors">
                  <div className="text-sm font-medium">Pick from phone contacts</div>
                  <div className="text-[0.65rem] text-stone-400 mt-0.5">Select multiple contacts directly. Chrome Android only.</div>
                </button>
              )}

              {/* Method 2: Import .vcf file (UNIVERSAL) */}
              <button onClick={() => { setShowImportSheet(false); fileInputRef.current?.click(); }}
                className="w-full text-left p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors">
                <div className="text-sm font-medium">Import from file (.vcf)</div>
                <div className="text-[0.65rem] text-stone-400 mt-0.5">
                  Works on ALL phones. Export contacts from your phone as .vcf first:
                </div>
                <div className="text-[0.6rem] text-stone-500 mt-1.5 space-y-0.5">
                  <div><strong>iPhone:</strong> Contacts → tap contact → Share → Save to Files → pick here</div>
                  <div><strong>Android:</strong> Contacts → ⋮ → Export → .vcf → pick here</div>
                </div>
              </button>

              {/* Method 3: Paste text (UNIVERSAL) */}
              <div className="p-3 rounded-2xl bg-stone-50">
                <div className="text-sm font-medium mb-2">Paste names & phones</div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={"Tommy, +46701234567\nSara, +46709876543\nLisa"}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono outline-none resize-none focus:border-stone-900"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[0.6rem] text-stone-400">One per line: name, phone (phone optional)</span>
                  <button
                    onClick={() => { addImportedContacts(parseText(pasteText)); setPasteText(""); }}
                    disabled={!pasteText.trim()}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-30">
                    Import
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setShowImportSheet(false)} className="w-full py-2 mt-3 text-sm text-stone-400 cursor-pointer">Cancel</button>
          </div>
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

            {/* Invite link + QR */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Invite others</p>
              <div className="p-3 rounded-2xl bg-stone-50 flex items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/split" : "")}`}
                  alt="QR code"
                  className="w-24 h-24 rounded-xl bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.72rem] text-stone-600 mb-2 leading-snug">Share this QR or link. Anyone who opens it joins the group.</p>
                  <button
                    onClick={() => {
                      const url = window.location.origin + "/split";
                      if (navigator.share) navigator.share({ title: "Walli Split", url });
                      else { navigator.clipboard.writeText(url); setToast("✅ Link copied"); setTimeout(() => setToast(""), 2000); }
                    }}
                    className="w-full py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer hover:bg-stone-800 transition-colors"
                  >📤 Share link</button>
                </div>
              </div>
            </div>

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

      {/* Group switcher sheet */}
      {showGroupSwitcher && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center" onClick={() => setShowGroupSwitcher(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Groups</h3>
            <p className="text-xs text-stone-400 mb-4">Switch between trips or projects. Each group has its own expenses.</p>

            {/* Default group (walliprag — always visible) */}
            {!groups.some(g => g.id === "walliprag") && (
              <button onClick={() => selectGroup("walliprag")}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-2 transition-colors cursor-pointer ${currentGroupId === "walliprag" ? "bg-stone-100 ring-2 ring-stone-900" : "bg-stone-50 hover:bg-stone-100"}`}>
                <span className="text-2xl">🧳</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">Walli Prag (default)</div>
                  <div className="text-[0.65rem] text-stone-400">Main trip group</div>
                </div>
                {currentGroupId === "walliprag" && <span className="text-stone-900">✓</span>}
              </button>
            )}

            {groups.map(g => (
              <div key={g.id} className={`flex items-center gap-1 mb-2 rounded-2xl ${currentGroupId === g.id ? "bg-stone-100 ring-2 ring-stone-900" : "bg-stone-50 hover:bg-stone-100"}`}>
                <button onClick={() => selectGroup(g.id)}
                  className="flex-1 flex items-center gap-3 p-3 transition-colors cursor-pointer text-left">
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[0.65rem] text-stone-400">{g.memberPhones.length} member{g.memberPhones.length === 1 ? "" : "s"}</div>
                  </div>
                  {currentGroupId === g.id && <span className="text-stone-900">✓</span>}
                </button>
                <button onClick={() => {
                  const url = `${window.location.origin}/split?join=${encodeURIComponent(g.id)}${env === "test" ? "&env=test" : ""}`;
                  if (navigator.share) navigator.share({ title: `Join ${g.name}`, text: `Join "${g.name}" on Walli Split:`, url });
                  else { navigator.clipboard.writeText(url); setToast("✅ Invite link copied"); setTimeout(() => setToast(""), 2000); }
                }}
                  className="p-3 text-stone-400 hover:text-stone-900 cursor-pointer"
                  title="Share invite link"
                >📤</button>
              </div>
            ))}

            {/* Create new group */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Create new group</p>
              <div className="flex gap-2">
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Rome 2026"
                  onKeyDown={e => e.key === "Enter" && createGroup()}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 text-sm outline-none border-2 border-transparent focus:border-stone-900" />
                <button onClick={createGroup} disabled={!newGroupName.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-30">
                  Create
                </button>
              </div>
            </div>

            <button onClick={() => setShowGroupSwitcher(false)} className="w-full py-2 mt-4 text-sm text-stone-400 cursor-pointer">Close</button>
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
            {/* Import contacts — multiple methods for all browsers */}
            <button onClick={() => setShowImportSheet(true)}
              className="w-full mb-3 py-2.5 rounded-2xl bg-stone-50 text-stone-700 border border-stone-200 text-sm font-medium cursor-pointer hover:bg-stone-100 transition-colors flex items-center justify-center gap-2">
              Import contacts
            </button>
            {importStatus && <p className="text-[0.65rem] text-stone-500 text-center mb-2">{importStatus}</p>}

            {/* Hidden file input for .vcf/.csv */}
            <input ref={fileInputRef} type="file" accept=".vcf,.csv,.txt" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFileImport(e.target.files[0]); e.target.value = ""; }} />

            {/* Quick-add with phone (registered user) */}
            <div className="p-3 rounded-2xl bg-stone-50 mb-3">
              <p className="text-[0.62rem] font-semibold text-stone-500 uppercase tracking-wider mb-2">Add with Swish number</p>
              <div className="space-y-2">
                <input type="text" value={quickAddName} onChange={e => setQuickAddName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2 rounded-xl bg-white text-sm outline-none border-2 border-transparent focus:border-stone-900" />
                <div className="flex gap-2">
                  <input type="tel" value={quickAddPhone} onChange={e => setQuickAddPhone(e.target.value)}
                    placeholder="Phone (e.g. +46701234567)"
                    onKeyDown={e => e.key === "Enter" && quickAddRegistered()}
                    className="flex-1 px-3 py-2 rounded-xl bg-white text-sm outline-none border-2 border-transparent focus:border-stone-900" />
                  <button onClick={quickAddRegistered} disabled={!quickAddName.trim() || !quickAddPhone.trim()}
                    className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-30">Add</button>
                </div>
              </div>
            </div>

            {/* Name-only add (local member) */}
            <div>
              <p className="text-[0.62rem] font-semibold text-stone-500 uppercase tracking-wider mb-2">Or just a name</p>
              <div className="flex gap-2">
                <input type="text" value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Name only (no Swish)"
                  onKeyDown={e => e.key === "Enter" && addMember()}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 text-sm outline-none border-2 border-transparent focus:border-stone-900" />
                <button onClick={addMember} disabled={!newMember.trim()} className="px-4 py-2.5 rounded-2xl bg-stone-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-30">Add</button>
              </div>
              <p className="text-[0.6rem] text-stone-400 mt-2">They can register themselves later to enable Swish (we&apos;ll auto-merge by name).</p>
            </div>
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
