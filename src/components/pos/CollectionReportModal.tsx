"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  HandCoins,
  Loader2,
  ReceiptText,
  Search,
  User,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime, formatPHP } from "@/lib/format";
import type { UtangSale, UtangSummary } from "@/lib/utang";

const LIMIT = 10;

export function CollectionReportModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sales, setSales] = useState<UtangSale[]>([]);
  const [summary, setSummary] = useState<UtangSummary>({
    totalCents: 0,
    collectedCents: 0,
    outstandingCents: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({
          status: "PAID",
          page: String(page),
          limit: String(LIMIT),
        });
        if (debouncedQuery) params.set("search", debouncedQuery);

        const res = await fetch(`/api/utang?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load report");
        const data = await res.json();
        if (!active) return;
        setSales(data.sales ?? []);
        setTotal(data.total ?? 0);
        setSummary(
          data.summary ?? { totalCents: 0, collectedCents: 0, outstandingCents: 0 },
        );
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const collectedTotal = summary.collectedCents || summary.totalCents;

  return (
    <Modal
      title="Collection report"
      subtitle="Every utang that has already been paid"
      size="lg"
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-ink-soft p-5 text-cream">
          <p className="text-xs font-semibold uppercase tracking-wider text-cream/45">
            Total collected
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular">
            {formatPHP(collectedTotal)}
          </p>
          <p className="mt-1 text-xs text-cream/50">
            {total} paid {total === 1 ? "record" : "records"}
            {debouncedQuery ? ` matching “${debouncedQuery}”` : ""}
          </p>
        </div>
        <div className="card flex flex-col justify-between p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
              Utang settled
            </p>
            <p className="mt-2 text-2xl font-bold tabular">{formatPHP(summary.totalCents)}</p>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-leaf">
            <CheckCircle2 className="h-3.5 w-3.5" /> Fully paid balances
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer name or ID"
          className="w-full rounded-2xl border border-ink/10 bg-white py-3 pl-10 pr-10 text-sm text-ink outline-none transition focus:border-ink/30 focus:ring-4 focus:ring-ink/5"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink/40 transition hover:bg-ink/5 hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/10 bg-cream/50 text-left text-ink/55">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Receipt</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Items</th>
              <th className="px-4 py-3 font-medium">Paid on</th>
              <th className="px-4 py-3 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
                  </span>
                </td>
              </tr>
            ) : failed ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-berry">
                  Could not load the report. Close and try again.
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  {debouncedQuery
                    ? `No paid utang found for “${debouncedQuery}”.`
                    : "No collected utang yet."}
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const collected = sale.collectedCents || sale.totalCents;
                const items = sale.items
                  .map((item) => item.productName)
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr key={sale.id} className="border-b border-ink/5 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
                          <User className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {sale.customer?.name ?? "Walk-in customer"}
                          </p>
                          <p className="truncate text-xs text-ink/45">
                            ID {sale.customer?.customerId ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                        <ReceiptText className="h-3.5 w-3.5" /> {sale.receiptNumber}
                      </span>
                    </td>
                    <td className="hidden max-w-[220px] px-4 py-3 md:table-cell">
                      <p className="truncate text-xs text-ink/55">{items || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/60">
                      {formatDateTime(sale.collectedAt ?? sale.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold tabular text-leaf">{formatPHP(collected)}</p>
                      <p className="text-[11px] text-ink/45">of {formatPHP(sale.totalCents)}</p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-ink/45">
          <HandCoins className="h-3.5 w-3.5" /> Payments are recorded per receipt
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              className="btn btn-secondary btn-sm"
            >
              Prev
            </button>
            <span className="text-xs text-ink/55">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages || loading}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
