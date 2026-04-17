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
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center hairline font-mono-data text-[11px] font-bold shrink-0">W</div>
            <div className="min-w-0">
              <h1 className="font-display text-sm md:text-base font-semibold tracking-tight truncate">Walli Split</h1>
              <p className="text-[10px] text-[#6b665e] font-mono-data">admin · {env}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
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

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8 md:space-y-10">
        {loading && <div className="text-center py-12"><div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto" /></div>}

        {!loading && (
          <>
            {/* Overview — typographic stats */}
            <section>
              <p className="text-caption mb-5">Overview</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
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

            {/* Users table — data-dense, professional */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-caption mb-1">Users</p>
                  <h2 className="font-display text-2xl font-semibold">Registered accounts</h2>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono-data text-[#6b665e]">
                  <span>GET /api/users?env={env}</span>
                  <span>· {users.length} rows</span>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="hairline p-12 text-center">
                  <p className="text-caption text-[#6b665e]">No records</p>
                  <p className="text-[11px] font-mono-data text-[#6b665e]/70 mt-2">POST /api/users to register</p>
                </div>
              ) : (
                <div className="hairline overflow-x-auto">
                  {/* Table head */}
                  <div className="grid grid-cols-[minmax(0,2fr)_1.5fr_1fr_auto] gap-4 px-5 py-2.5 hairline-b" style={{ backgroundColor: "#f4f1ea" }}>
                    <div className="text-caption">Name</div>
                    <div className="text-caption">Phone</div>
                    <div className="text-caption">Created</div>
                    <div className="text-caption text-right">Actions</div>
                  </div>
                  {/* Rows */}
                  {users.map((u, idx) => (
                    <div key={u.phone}
                      className={`grid grid-cols-[minmax(0,2fr)_1.5fr_1fr_auto] gap-4 px-5 py-3 items-center hover:bg-[#f4f1ea]/50 transition-colors ${idx !== users.length - 1 ? "hairline-b" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-white shrink-0" style={{ backgroundColor: u.color, borderRadius: "3px" }}>
                          {u.avatar}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium truncate flex items-center gap-1.5">
                            <span className={`status-dot ${u.deleted ? "status-error" : "status-active"}`} />
                            {u.name}{u.deleted && <span className="text-[10px] font-mono-data text-[#9e4444]">[deleted]</span>}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono-data text-[12px] text-[#6b665e] truncate">{u.phone}</div>
                      <div className="font-mono-data text-[11px] text-[#6b665e]">
                        {new Date(u.createdAt).toISOString().slice(0, 10)}
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditUser(u); setEditName(u.name); setEditPhone(u.phone); }}
                          className="px-2.5 py-1 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#6b665e] hover:bg-[#f4f1ea] cursor-pointer">edit</button>
                        <button onClick={() => deleteUser(u.phone)}
                          className="px-2.5 py-1 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#9e4444] hover:bg-[#9e4444]/5 cursor-pointer" style={{ borderColor: "#9e4444", opacity: 0.6 }}>del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Groups table */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-caption mb-1">Groups</p>
                  <h2 className="font-display text-2xl font-semibold">Expense groups</h2>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono-data text-[#6b665e]">
                  <span>GET /api/groups?env={env}</span>
                  <span>· {groups.length} rows</span>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="hairline p-12 text-center">
                  <p className="text-caption text-[#6b665e]">No records</p>
                  <p className="text-[11px] font-mono-data text-[#6b665e]/70 mt-2">POST /api/groups to create</p>
                </div>
              ) : (
                <div className="hairline overflow-x-auto">
                  <div className="grid grid-cols-[minmax(0,2fr)_2fr_auto_1fr_auto] gap-4 px-5 py-2.5 hairline-b" style={{ backgroundColor: "#f4f1ea" }}>
                    <div className="text-caption">Name</div>
                    <div className="text-caption">ID</div>
                    <div className="text-caption">Members</div>
                    <div className="text-caption">Created</div>
                    <div className="text-caption text-right">Actions</div>
                  </div>
                  {groups.map((g, idx) => (
                    <div key={g.id}
                      className={`grid grid-cols-[minmax(0,2fr)_2fr_auto_1fr_auto] gap-4 px-5 py-3 items-center hover:bg-[#f4f1ea]/50 transition-colors ${idx !== groups.length - 1 ? "hairline-b" : ""}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{g.emoji}</span>
                        <span className="text-[13px] font-medium truncate">{g.name}</span>
                      </div>
                      <div className="font-mono-data text-[11px] text-[#6b665e] truncate">{g.id}</div>
                      <div className="font-mono-data text-[12px] tabular-nums">{g.memberPhones.length}</div>
                      <div className="font-mono-data text-[11px] text-[#6b665e]">
                        {new Date(g.createdAt).toISOString().slice(0, 10)}
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => {
                          const url = `${window.location.origin}/split?join=${g.id}${env === "test" ? "&env=test" : ""}`;
                          navigator.clipboard.writeText(url);
                          notify("link copied to clipboard");
                        }} className="px-2.5 py-1 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#6b665e] hover:bg-[#f4f1ea] cursor-pointer">copy</button>
                        <button onClick={() => deleteGroup(g.id)}
                          className="px-2.5 py-1 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#9e4444] hover:bg-[#9e4444]/5 cursor-pointer" style={{ borderColor: "#9e4444", opacity: 0.6 }}>del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Danger zone */}
            {env === "test" && (
              <section className="hairline p-6" style={{ borderColor: "#9e4444", backgroundColor: "#9e4444" + "08" }}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-caption mb-1" style={{ color: "#9e4444" }}>Danger Zone</p>
                    <h2 className="font-display text-lg font-semibold mb-2">Reset test environment</h2>
                    <p className="text-[12px] text-[#6b665e] max-w-md">
                      Destroys all test users, groups, expenses and settlements. Production data is untouched. This action cannot be undone.
                    </p>
                    <p className="mt-3 text-[10px] font-mono-data text-[#6b665e]">
                      DELETE split-test/* users-test/* groups-test/*
                    </p>
                  </div>
                  <button onClick={resetTestData}
                    className="px-4 py-2 font-mono-data text-[11px] uppercase tracking-wider text-white cursor-pointer transition-colors"
                    style={{ backgroundColor: "#9e4444" }}>
                    Reset all
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditUser(null)}>
          <div className="hairline w-full max-w-md shadow-2xl" style={{ backgroundColor: "#faf9f5" }} onClick={e => e.stopPropagation()}>
            <div className="hairline-b px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-caption">Edit · Users</p>
                <p className="font-mono-data text-[11px] text-[#6b665e] mt-0.5">{editUser.phone}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-[#6b665e] hover:text-[#1a1715] text-lg cursor-pointer leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-caption block mb-1.5">Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 hairline font-mono-data text-[13px] outline-none focus:border-[#c96442] transition-colors"
                  style={{ backgroundColor: "white" }} />
              </div>
              <div>
                <label className="text-caption block mb-1.5">Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 hairline font-mono-data text-[13px] outline-none focus:border-[#c96442] transition-colors"
                  style={{ backgroundColor: "white" }} />
              </div>
              <div>
                <label className="text-caption block mb-1.5">Created</label>
                <p className="font-mono-data text-[12px] text-[#6b665e]">{new Date(editUser.createdAt).toISOString()}</p>
              </div>
            </div>
            <div className="hairline-t px-5 py-3 flex gap-2 justify-end">
              <button onClick={() => setEditUser(null)} className="px-3 py-1.5 hairline text-[10px] font-mono-data uppercase tracking-wider text-[#6b665e] hover:bg-[#f4f1ea] cursor-pointer">cancel <kbd className="kbd ml-1">esc</kbd></button>
              <button onClick={saveUser} disabled={!editName.trim() || !editPhone.trim()}
                className="px-3 py-1.5 text-[10px] font-mono-data uppercase tracking-wider text-white cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: "#c96442" }}>save <kbd className="kbd ml-1" style={{ backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)", color: "white" }}>↵</kbd></button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="hairline-t mt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between text-[10px] font-mono-data text-[#6b665e]">
          <span>walli-split · v2.1.0 · build {typeof window !== "undefined" ? "a4b9c8" : "—"}</span>
          <span className="flex items-center gap-2">
            <span className="status-dot status-active" />
            <span>api operational</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
