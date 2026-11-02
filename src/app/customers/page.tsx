"use client";

import { useCallback, useEffect, useState } from "react";
import { AppBar } from "@/components/pos/AppBar";
import { useToast } from "@/components/ui/Toast";
import { Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { CustomerFormModal, type CustomerRecord } from "@/components/customers/CustomerFormModal";

type Customer = CustomerRecord;

const PAGE_SIZE = 10;

async function fetchCustomers(search: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", page.toString());
  params.set("limit", PAGE_SIZE.toString());
  const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load");
  return (await res.json()) as { customers: Customer[]; total: number };
}

export function CustomersView() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const limit = PAGE_SIZE;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers(search, page);
      setCustomers(data.customers);
      setTotal(data.total);
    } catch {
      toast({ title: "Failed to load customers", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    let cancelled = false;
    fetchCustomers(search, page)
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers);
        setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load customers", variant: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, page, toast]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    loadData();
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Customer deleted", variant: "success" });
      loadData();
    } catch {
      toast({ title: "Failed to delete", variant: "error" });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Customers</h1>
            <p className="text-sm text-ink/55">Manage your store customers</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Add customer</button>
        </header>

        <div className="mt-6 card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input value={search} onChange={(e) => { setLoading(true); setSearch(e.target.value); setPage(1); }} placeholder="Search by name, ID, contact" className="w-full rounded-2xl border border-ink/10 bg-white/80 pl-10 pr-4 py-2.5 text-sm text-ink outline-none transition focus:border-ink/30" />
          </div>
        </div>

        <div className="mt-4 card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 bg-cream/40 text-ink/55">
              <tr>
                <th className="text-left font-medium px-4 py-3">Customer</th>
                <th className="text-left font-medium px-4 py-3">Contact</th>
                <th className="text-left font-medium px-4 py-3">Address</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">Loading...</td></tr> : customers.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">No customers found</td></tr> : customers.map((c) => (
                <tr key={c.id} className="border-b border-ink/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 text-ink overflow-hidden">
                        {c.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-ink/50">ID: {c.customerId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{c.contactNumber || "—"}</td>
                  <td className="px-4 py-3 text-ink/70 max-w-[200px] truncate">{c.address || "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{new Date(c.createdAt).toLocaleDateString("en-PH")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg p-2 hover:bg-ink/5"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c)} className="rounded-lg p-2 text-berry hover:bg-berry/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => { setLoading(true); setPage(p => Math.max(1, p-1)); }} disabled={page === 1} className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>
            <span className="px-3 py-1.5 text-sm text-ink/60">{page} / {totalPages}</span>

            <button onClick={() => { setLoading(true); setPage(p => Math.min(totalPages, p+1)); }} disabled={page === totalPages} className="rounded-lg border border-ink/10 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        )}

        {showForm && (
          <CustomerFormModal
            customer={editing}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={handleSaved}
          />
        )}
      </main>
  );
}

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <CustomersView />
    </div>
  );
}
