"use client";

import { useEffect, useState } from "react";
import { Building2, Check, LayoutDashboard, PanelLeft, Plus, Rows3, Trash2, UserPlus } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api-client";

type LayoutMode = "comfortable" | "compact" | "wide";
type Store = { id: string; name: string; slug: string | null; status: "ACTIVE" | "SUSPENDED"; address: string | null; phone: string | null; _count: { users: number; products: number; sales: number } };
type User = { id: string; storeId: string; name: string; email: string | null; role: string; active: boolean; store: { name: string } };

export function SuperAdminPanel() {
  const [layout, setLayout] = useState<LayoutMode>("comfortable");
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [storeName, setStoreName] = useState("");
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", storeId: "", role: "CASHIER" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [storeData, userData] = await Promise.all([apiRequest<{ stores: Store[] }>("/api/super-admin/stores"), apiRequest<{ users: User[] }>("/api/super-admin/users")]);
    setStores(storeData.stores); setUsers(userData.users);
    setUserForm((current) => ({ ...current, storeId: current.storeId || storeData.stores[0]?.id || "" }));
  }
  useEffect(() => { void Promise.resolve().then(load).catch((error) => setMessage(error.message)); }, []);

  async function addStore(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await apiRequest("/api/super-admin/stores", { method: "POST", ...jsonBody({ name: storeName }) }); setStoreName(""); await load(); setMessage("Store added."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add store."); } finally { setBusy(false); }
  }
  async function addUser(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await apiRequest("/api/super-admin/users", { method: "POST", ...jsonBody(userForm) }); setUserForm((current) => ({ ...current, name: "", email: "", password: "" })); await load(); setMessage("User added."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add user."); } finally { setBusy(false); }
  }
  async function remove(url: string, id: string, label: string) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setBusy(true); setMessage("");
    try { await apiRequest(url, { method: "DELETE", ...jsonBody({ id }) }); await load(); setMessage(`${label} deleted.`); } catch (error) { setMessage(error instanceof Error ? error.message : `Unable to delete ${label}.`); } finally { setBusy(false); }
  }
  async function toggleStore(store: Store) {
    try { await apiRequest("/api/super-admin/stores", { method: "PATCH", ...jsonBody({ id: store.id, status: store.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }) }); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update store."); }
  }
  async function toggleUser(user: User) {
    try { await apiRequest("/api/super-admin/users", { method: "PATCH", ...jsonBody({ id: user.id, active: !user.active }) }); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update user."); }
  }

  const options = [{ id: "comfortable" as const, label: "Comfortable", description: "More breathing room", icon: LayoutDashboard }, { id: "compact" as const, label: "Compact", description: "Fit more data on screen", icon: Rows3 }, { id: "wide" as const, label: "Wide navigation", description: "Keep tools visible", icon: PanelLeft }];
  return <section className="mt-8 space-y-6">
    <div className="card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-ink/45">System layout</p><h2 className="mt-1 text-xl font-bold">Choose the admin workspace layout</h2><p className="mt-1 max-w-xl text-sm text-ink/55">Preview a layout density before applying it to your system dashboard.</p></div><span className="rounded-full bg-mango/20 px-3 py-1 text-xs font-semibold text-ink">Preview</span></div><div className="mt-5 grid gap-3 md:grid-cols-3">{options.map((option) => { const Icon = option.icon; const active = layout === option.id; return <button key={option.id} type="button" onClick={() => setLayout(option.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-ink bg-ink text-cream" : "border-ink/10 bg-white hover:border-ink/30"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-mango text-ink" : "bg-cream text-ink"}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{option.label}</span><span className={`block text-xs ${active ? "text-cream/65" : "text-ink/50"}`}>{option.description}</span></span>{active && <Check className="h-4 w-4 shrink-0 text-mango" />}</button>; })}</div></div>
    {message && <p role="status" className="rounded-xl bg-leaf-soft px-4 py-3 text-sm font-medium text-ink">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="card p-6"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-mango" /><h2 className="text-xl font-bold">Stores</h2></div><form onSubmit={addStore} className="mt-4 flex gap-2"><input required value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="New store name" className="min-w-0 flex-1 rounded-xl border border-ink/10 px-3 py-2 text-sm" /><button disabled={busy} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" />Add</button></form><div className="mt-5 space-y-3">{stores.map((store) => <div key={store.id} className="rounded-xl border border-ink/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{store.name}</p><p className="text-xs text-ink/50">{store._count.users} users · {store._count.products} products · {store._count.sales} sales</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${store.status === "ACTIVE" ? "bg-leaf-soft" : "bg-berry/15 text-berry"}`}>{store.status}</span></div><div className="mt-3 flex gap-2"><button onClick={() => toggleStore(store)} className="btn btn-secondary btn-xs">{store.status === "ACTIVE" ? "Suspend" : "Activate"}</button><button onClick={() => remove("/api/super-admin/stores", store.id, "store")} className="btn btn-danger btn-xs"><Trash2 className="h-3 w-3" />Delete</button></div></div>)}</div></div>
      <div className="card p-6"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-mango" /><h2 className="text-xl font-bold">Users</h2></div><form onSubmit={addUser} className="mt-4 grid gap-2 sm:grid-cols-2"><input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" className="rounded-xl border border-ink/10 px-3 py-2 text-sm" /><input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="Email" className="rounded-xl border border-ink/10 px-3 py-2 text-sm" /><input required minLength={8} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Temporary password" className="rounded-xl border border-ink/10 px-3 py-2 text-sm" /><select value={userForm.storeId} onChange={(e) => setUserForm({ ...userForm, storeId: e.target.value })} className="rounded-xl border border-ink/10 px-3 py-2 text-sm"><option value="">Select store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="rounded-xl border border-ink/10 px-3 py-2 text-sm"><option value="CASHIER">Cashier</option><option value="OWNER">Owner</option></select><button disabled={busy || !userForm.storeId} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" />Add user</button></form><div className="mt-5 space-y-3">{users.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3"><div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-xs text-ink/50">{user.email} · {user.store.name} · {user.role}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => toggleUser(user)} className="btn btn-secondary btn-xs">{user.active ? "Disable" : "Enable"}</button><button onClick={() => remove("/api/super-admin/users", user.id, "user")} aria-label={`Delete ${user.name}`} className="btn btn-danger btn-xs"><Trash2 className="h-3 w-3" /></button></div></div>)}</div></div>
    </div>
  </section>;
}
