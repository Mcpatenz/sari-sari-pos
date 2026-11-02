"use client";

import { useEffect, useState } from "react";
import { AppBar } from "@/components/pos/AppBar";
import { CollectionReportModal } from "@/components/pos/CollectionReportModal";
import { RepayModal } from "@/components/pos/RepayModal";
import { useToast } from "@/components/ui/Toast";
import { formatPHP } from "@/lib/format";
import type { UtangSale, UtangSummary } from "@/lib/utang";
import { FileText, Search, User, Wallet } from "lucide-react";

export function UtangView() {
  const { toast } = useToast();
  const [sales, setSales] = useState<UtangSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<UtangSummary>({
    totalCents: 0,
    collectedCents: 0,
    outstandingCents: 0,
  });
  const [repaySale, setRepaySale] = useState<UtangSale | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const limit = 10;

  async function refreshList() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    const res = await fetch(`/api/utang?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSales(data.sales ?? []);
    setTotal(data.total ?? 0);
    setSummary(data.summary ?? { totalCents: 0, collectedCents: 0, outstandingCents: 0 });
    if ((data.sales ?? []).length === 0 && page > 1) setPage((current) => current - 1);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("page", page.toString());
        params.set("limit", limit.toString());
        const res = await fetch(`/api/utang?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (active) {
          setSales(data.sales);
          setTotal(data.total);
          setSummary(
            data.summary ?? { totalCents: 0, collectedCents: 0, outstandingCents: 0 },
          );
        }
      } catch {
        if (active) toast({ title: "Failed to load utang", variant: "error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [search, page, toast]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Utang</h1>
            <p className="text-sm text-ink/55">List of credit transactions</p>
          </div>
          <button type="button" onClick={() => setReportOpen(true)} className="btn btn-secondary btn-sm rounded-full">
            <FileText className="h-4 w-4" /> Collection report
          </button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-ink-soft p-5 text-cream shadow-lg shadow-ink/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">Outstanding utang</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular">{formatPHP(summary.outstandingCents)}</p>
            <p className="mt-1 text-xs text-cream/50">
              {total} open {total === 1 ? "record" : "records"} · collect payments below
            </p>
          </div>
          <div className="card flex flex-col justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Partially collected</p>
              <p className="mt-2 text-2xl font-bold tabular">{formatPHP(summary.collectedCents)}</p>
            </div>
            <p className="mt-2 text-xs text-ink/45">Already paid on open utang</p>
          </div>
        </div>

        <div className="mt-4 card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search customer name or ID"
                className="w-full rounded-2xl border border-ink/10 bg-white/80 pl-10 pr-4 py-2.5 text-sm text-ink outline-none transition focus:border-ink/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 bg-cream/40 text-ink/55">
              <tr>
                <th className="text-left font-medium px-4 py-3">Customer</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Items</th>
                <th className="text-left font-medium px-4 py-3">Total Items</th>
                <th className="text-right font-medium px-4 py-3">Amount</th>
                <th className="text-left font-medium px-4 py-3">Cashier</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/50">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/50">No utang found</td></tr>
              ) : (
                sales.map((s) => {
                  const totalItems = s.items.reduce((sum, it) => sum + it.quantityBase, 0);
                  return (
                    <tr key={s.id} className="border-b border-ink/5 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 text-ink overflow-hidden">
                            {s.customer?.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.customer.photoUrl}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{s.customer?.name || "—"}</p>
                            <p className="text-xs text-ink/50">ID: {s.customer?.customerId || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink/70">
                        {new Date(s.createdAt).toLocaleString("en-PH")}
                      </td>
                      <td className="px-4 py-3 text-ink/70 max-w-[200px] truncate">
                        {s.items.map(it => `${it.productName} (${it.quantityBase})`).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-ink/70">{totalItems}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold tabular">{formatPHP(s.totalCents - s.collectedCents)}</p>
                        <p className="text-[11px] text-ink/45">of {formatPHP(s.totalCents)}</p>
                        {s.collectedCents > 0 && (
                          <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-ink/10">
                            <div
                              className="h-full rounded-full bg-leaf"
                              style={{
                                width: `${Math.min(100, Math.round((s.collectedCents / s.totalCents) * 100))}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/70">{s.cashier?.name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setRepaySale(s)} className="btn btn-leaf btn-xs rounded-full">
                          <Wallet className="h-3.5 w-3.5" /> Repay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-ink/60">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </main>
      {repaySale && (
        <RepayModal
          sale={repaySale}
          onClose={() => setRepaySale(null)}
          onPaid={(result) => {
            setRepaySale(null);
            toast({
              title: result.paid ? "Utang fully paid" : "Payment recorded",
              description: result.paid
                ? "The balance is settled and moved to the collection report."
                : `${formatPHP(result.remainingCents)} remains on this utang.`,
              variant: "success",
            });
            void refreshList();
          }}
        />
      )}
      {reportOpen && <CollectionReportModal onClose={() => setReportOpen(false)} />}
    </>
  );
}

export default function UtangPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <UtangView />
    </div>
  );
}
