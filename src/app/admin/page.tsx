"use client";

import { useEffect, useState } from "react";

interface User {
  phone: string; name: string; color: string; avatar: string;
  createdAt: string; deleted?: boolean;
}
interface Group {
  id: string; name: string; emoji: string; createdBy: string;
  createdAt: string; memberPhones: string[];
}

type Env = "prod" | "test";

function envParam(env: Env) { return `?env=${env}`; }

export default function AdminPage() {
  const [env, setEnv] = useState<Env>("prod");
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [toast, setToast] = useState("");
  const [stats, setStats] = useState<{ totalCZK: number; expenseCount: number } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [uRes, gRes, sRes] = await Promise.all([
      fetch(`/api/users${envParam(env)}`, { cache: "no-store" }),
      fetch(`/api/groups${envParam(env)}`, { cache: "no-store" }),
      fetch(`/api/split${envParam(env)}`, { cache: "no-store" }),
    ]);
    if (uRes.ok) setUsers((await uRes.json()).users || []);
    if (gRes.ok) setGroups((await gRes.json()).groups || []);
    if (sRes.ok) { const d = await sRes.json(); setStats({ totalCZK: d.stats?.totalCZK || 0, expenseCount: d.stats?.expenseCount || 0 }); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [env]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const saveUser = async () => {
    if (!editUser) return;
    await fetch(`/api/users${envParam(env)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone }),
    });
    // If phone changed, delete old
    if (editPhone !== editUser.phone) {
      await fetch(`/api/users${envParam(env)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editUser.phone }),
      });
    }
    setEditUser(null);
    notify("✅ User saved");
    fetchAll();
  };

  const deleteUser = async (phone: string) => {
    if (!confirm(`Delete user with phone ${phone}?`)) return;
    await fetch(`/api/users${envParam(env)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    notify("✅ User deleted");
    fetchAll();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm(`Delete group ${id}? (expenses remain)`)) return;
    // No dedicated delete endpoint — just notify
    notify("⚠️ Group deletion via blob dashboard (manual)");
  };

  const resetTestData = async () => {
    if (env !== "test") return;
    if (!confirm("RESET ALL TEST DATA? Users + expenses + groups?")) return;
    await fetch(`/api/split/reset?env=test`, { method: "POST" });
    notify("✅ All test data reset");
    fetchAll();
  };

  return (
    <div className="min-h-screen text-[#1a1715] font-[family-name:var(--font-inter)]" style={{ backgroundColor: "#faf9f5" }}>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#1a1715] text-[#faf9f5] text-xs font-mono-data shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 hairline-b" style={{ backgroundColor: "#faf9f5" }}>
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center hairline font-mono-data text-[11px] font-bold">W</div>
            <div>
              <h1 className="font-display text-base font-semibold tracking-tight">Walli Split</h1>
              <p className="text-[10px] text-[#6b665e] font-mono-data">admin · {env}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex hairline overflow-hidden">
              {(["prod", "test"] as Env[]).map(e => (
                <button key={e} onClick={() => setEnv(e)}
                  className={`px-3 py-1.5 text-[10px] font-mono-data uppercase tracking-wider cursor-pointer transition-colors ${env === e
                    ? "bg-[#1a1715] text-[#faf9f5]"
                    : "bg-transparent text-[#6b665e] hover:bg-[#f4f1ea]"}`}>
                  {e}
                </button>
              ))}
            </div>
            <a href="/split" className="px-3 py-1.5 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#6b665e] hover:bg-[#f4f1ea] cursor-pointer">
              ← split
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8 space-y-10">
        {loading && <div className="text-center py-12"><div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto" /></div>}

        {!loading && (
          <>
            {/* Overview — typographic stats */}
            <section>
              <p className="text-caption mb-5">Overview</p>
              <div className="grid grid-cols-4 gap-8">
                <div>
                  <p className="font-display text-4xl font-semibold">{users.length}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono-data text-[#6b665e]">
                    <span className="status-dot status-active" />users
                  </div>
                </div>
                <div>
                  <p className="font-display text-4xl font-semibold">{groups.length}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono-data text-[#6b665e]">
                    <span className="status-dot status-active" />groups
                  </div>
                </div>
                <div>
                  <p className="font-display text-4xl font-semibold">{stats?.expenseCount || 0}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono-data text-[#6b665e]">
                    <span className="status-dot status-active" />expenses
                  </div>
                </div>
                <div>
                  <p className="font-display text-4xl font-semibold font-mono-data">{(stats?.totalCZK || 0).toLocaleString()}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono-data text-[#6b665e]">
                    <span>CZK · total volume</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Users table */}
            <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-sm font-bold">Users ({users.length})</h2>
                <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase ${env === "test" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {env}
                </span>
              </div>
              {users.length === 0 && <p className="p-5 text-sm text-stone-400">No users registered</p>}
              <div className="divide-y divide-stone-100">
                {users.map(u => (
                  <div key={u.phone} className="px-5 py-3 flex items-center gap-3 hover:bg-stone-50">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: u.color }}>
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{u.name}{u.deleted ? " [DELETED]" : ""}</p>
                      <p className="text-xs text-stone-400">{u.phone}</p>
                    </div>
                    <p className="text-[0.6rem] text-stone-400 shrink-0">
                      {new Date(u.createdAt).toLocaleDateString("sv-SE")}
                    </p>
                    <button onClick={() => { setEditUser(u); setEditName(u.name); setEditPhone(u.phone); }}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-medium text-stone-600 cursor-pointer hover:bg-stone-200">Edit</button>
                    <button onClick={() => deleteUser(u.phone)}
                      className="px-2.5 py-1 rounded-lg bg-red-50 text-xs font-medium text-red-600 cursor-pointer hover:bg-red-100">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups table */}
            <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100">
                <h2 className="text-sm font-bold">Groups ({groups.length})</h2>
              </div>
              {groups.length === 0 && <p className="p-5 text-sm text-stone-400">No groups created</p>}
              <div className="divide-y divide-stone-100">
                {groups.map(g => (
                  <div key={g.id} className="px-5 py-3 flex items-center gap-3 hover:bg-stone-50">
                    <span className="text-xl">{g.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{g.name}</p>
                      <p className="text-xs text-stone-400">ID: {g.id} · {g.memberPhones.length} members · by {g.createdBy}</p>
                    </div>
                    <p className="text-[0.6rem] text-stone-400 shrink-0">
                      {new Date(g.createdAt).toLocaleDateString("sv-SE")}
                    </p>
                    <button onClick={() => {
                      const url = `${window.location.origin}/split?join=${g.id}${env === "test" ? "&env=test" : ""}`;
                      navigator.clipboard.writeText(url);
                      notify("✅ Invite link copied");
                    }} className="px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-medium text-stone-600 cursor-pointer hover:bg-stone-200">
                      📤 Link
                    </button>
                    <button onClick={() => deleteGroup(g.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-50 text-xs font-medium text-red-600 cursor-pointer hover:bg-red-100">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            {env === "test" && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
                <h2 className="text-sm font-bold text-red-800 mb-2">⚠ Danger Zone (Test only)</h2>
                <p className="text-xs text-red-700 mb-3">This will delete ALL test users, groups, expenses and settlements.</p>
                <button onClick={resetTestData}
                  className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold cursor-pointer hover:bg-red-700 transition-colors">
                  🗑 Reset ALL test data
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Edit user</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border-2 border-stone-200 text-sm outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border-2 border-stone-200 text-sm outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Created</label>
                <p className="text-sm text-stone-600">{new Date(editUser.createdAt).toLocaleString("sv-SE")}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl bg-stone-100 text-sm font-medium text-stone-600 cursor-pointer">Cancel</button>
              <button onClick={saveUser} disabled={!editName.trim() || !editPhone.trim()}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold cursor-pointer disabled:opacity-30">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
