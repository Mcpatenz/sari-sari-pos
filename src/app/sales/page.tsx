"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronDown,
  CloudOff,
  Loader2,
  Printer,
  RefreshCw,
  Receipt,
  Search,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import type { LocalSale, LocalSaleItem } from "@/lib/db";
import { formatPHP, formatQuantity } from "@/lib/format";
import { formatDateTime } from "@/lib/format";
import { refreshProductsFromServer } from "@/lib/products-api";
import { syncPendingSales } from "@/lib/sales-sync";
import { voidSale, type SaleVoidAction } from "@/lib/sales-api";

const SYNC_STYLE: Record<LocalSale["syncStatus"], string> = {
  SYNCED: "bg-leaf/10 text-leaf",
  PENDING: "bg-mango/15 text-mango",
  FAILED: "bg-berry/10 text-berry",
};

export function SalesView() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"today" | "week" | "all">("today");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<LocalSale | null>(null);
  const [reprint, setReprint] = useState<{
    sale: LocalSale;
    items: LocalSaleItem[];
  } | null>(null);

  const sales = useLiveQuery(
    () => db.sales.orderBy("createdAt").reverse().toArray(),
    [],
    [],
  ) as LocalSale[];

  // Date math stays inside the client-only live query so it never runs at prerender.
  const filtered = useLiveQuery(
    async () => {
      const all = await db.sales.orderBy("createdAt").reverse().toArray();
      const term = query.trim().toLowerCase();
      let list = all;
      // An explicit date (YYYY-MM-DD) takes precedence over the period toggle.
      if (date) {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        list = list.filter((sale) => {
          const at = new Date(sale.createdAt).getTime();
          return at >= start.getTime() && at < end.getTime();
        });
      } else if (filter !== "all") {
        const now = new Date();
        const start = new Date(now);
        if (filter === "today") start.setHours(0, 0, 0, 0);
        else start.setDate(now.getDate() - 6);
        list = list.filter((sale) => new Date(sale.createdAt) >= start);
      }
      if (term) {
        list = list.filter((sale) =>
          sale.receiptNumber.toLowerCase().includes(term),
        );
      }
      return list;
    },
    [filter, query, date],
    [],
  ) as LocalSale[];

  const total = filtered.reduce((sum, sale) => sum + sale.totalCents, 0);
  const pending = sales.filter((sale) => sale.syncStatus === "PENDING").length;
  const failed = sales.filter((sale) => sale.syncStatus === "FAILED").length;

  async function openReprint(sale: LocalSale) {
    const items = await db.saleItems.where("saleId").equals(sale.id).toArray();
    setReprint({ sale, items });
  }

  async function retry(sale: LocalSale) {
    await db.sales.update(sale.id, { syncStatus: "PENDING", syncError: undefined });
    const result = await syncPendingSales();
    if (result.failed > 0) {
      toast({ title: "Still could not sync", variant: "error" });
    } else {
      toast({ title: "Synced", variant: "success" });
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sales</h1>
            <p className="text-sm text-ink/55">
              Every receipt saved on this device, synced when online.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-ink/10 bg-white p-1">
              {(["today", "week", "all"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setFilter(item);
                    setDate("");
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                    filter === item && !date ? "bg-ink text-cream" : "text-ink/60"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Filter sales by date"
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15 ${
                date ? "border-leaf text-leaf" : "border-ink/10 text-ink/60"
              }`}
            />
            {date && (
              <button
                type="button"
                onClick={() => setDate("")}
                className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-berry hover:text-berry"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by receipt number…"
            className="w-full rounded-2xl border border-ink/12 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Sales
            </p>
            <p className="mt-1 text-2xl font-bold tabular">{filtered.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Revenue
            </p>
            <p className="mt-1 text-2xl font-bold tabular">{formatPHP(total)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Sync queue
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular">
              {pending}
              {failed > 0 && <span className="text-base text-berry">· {failed} failed</span>}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filtered.map((sale) => (
            <SaleRow
              key={sale.id}
              sale={sale}
              open={openId === sale.id}
              onToggle={() => setOpenId((current) => (current === sale.id ? null : sale.id))}
              onRetry={() => void retry(sale)}
              onRequestVoid={() => setVoiding(sale)}
              onReprint={() => void openReprint(sale)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="card flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                <Receipt className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink/55">
                {query.trim()
                  ? `No receipt matches “${query.trim()}”.`
                  : date
                    ? `No sales on ${date}.`
                    : "No sales in this period yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {voiding && (
        <VoidForm sale={voiding} onClose={() => setVoiding(null)} />
      )}

      {reprint && (
        <ReceiptModal
          sale={reprint.sale}
          items={reprint.items}
          onClose={() => setReprint(null)}
        />
      )}
    </>
  );
}

export default function SalesPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <SalesView />
    </div>
  );
}

function VoidForm({
  sale,
  onClose,
}: {
  sale: LocalSale;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [action, setAction] = useState<SaleVoidAction>("VOID");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!sale.serverId) return;
    setBusy(true);
    try {
      const result = await voidSale({
        saleId: sale.serverId,
        action,
        note: note.trim() || undefined,
      });
      await db.sales.update(sale.id, { status: result.status });
      // Voiding/returning puts the items back, so refresh the local cache.
      await refreshProductsFromServer().catch(() => {});
      toast({
        title: action === "VOID" ? "Sale voided" : "Sale returned",
        description: "Stock was restored to inventory.",
        variant: "success",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Could not complete the request",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={sale.receiptNumber}
      subtitle={`${formatPHP(sale.totalCents)} · ${formatDateTime(sale.createdAt)}`}
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex rounded-2xl border border-ink/12 p-1">
          {(["VOID", "RETURN"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAction(item)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                action === item ? "bg-ink text-cream" : "text-ink/60"
              }`}
            >
              {item === "VOID" ? "Void (cancel sale)" : "Return (refund)"}
            </button>
          ))}
        </div>

        <p className="rounded-2xl bg-mango/10 px-4 py-3 text-xs text-ink/65">
          The items are added back to inventory either way. A void cancels the
          whole sale; a return marks the goods as refunded.
        </p>

        <FloatingInput
          label="Reason (optional)"
          value={note}
          onChange={setNote}
        />

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="btn btn-danger btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "VOID" ? "Void sale" : "Return sale"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-ink/15 px-5 py-3.5 font-semibold transition hover:bg-ink/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SaleRow({
  sale,
  open,
  onToggle,
  onRetry,
  onRequestVoid,
  onReprint,
}: {
  sale: LocalSale;
  open: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onRequestVoid: () => void;
  onReprint: () => void;
}) {
  const items = useLiveQuery(
    () => db.saleItems.where("saleId").equals(sale.id).toArray(),
    [sale.id],
  );

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-ink/[0.02]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/5 text-ink/60">
          <Receipt className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{sale.receiptNumber}</p>
          <p className="text-xs text-ink/50">{formatDateTime(sale.createdAt)}</p>
        </div>
        <span
          className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold uppercase sm:inline-block ${SYNC_STYLE[sale.syncStatus]}`}
        >
          {sale.syncStatus}
        </span>
        <span className="text-right font-bold tabular">
          {formatPHP(sale.totalCents)}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-ink/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-ink/10 bg-white/50 p-4">
          {items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-ink/55">
                      {formatQuantity(item.kind, item.quantityBase)}
                      {item.unitLabel ? ` · ${item.unitLabel}` : ""}
                    </p>
                  </div>
                  <span className="tabular">{formatPHP(item.lineTotalCents)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/50">Loading items…</p>
          )}

          <div className="mt-4 grid gap-2 border-t border-ink/10 pt-3 text-sm sm:grid-cols-3">
            <div className="flex justify-between sm:block">
              <span className="text-ink/55">Payment</span>
              <p className="font-semibold">
                {sale.paymentMethod === "GCASH"
                  ? "GCash"
                  : sale.paymentMethod === "UTANG"
                    ? "Utang"
                    : "Cash"}
              </p>
            </div>
            {sale.paymentMethod === "GCASH" ? (
              <div className="flex justify-between sm:block">
                <span className="text-ink/55">Ref no.</span>
                <p className="font-semibold tabular">
                  {sale.referenceNumber || "—"}
                </p>
              </div>
            ) : sale.paymentMethod === "UTANG" ? (
              <div className="flex justify-between sm:block">
                <span className="text-ink/55">Charged</span>
                <p className="font-semibold tabular">{formatPHP(sale.totalCents)}</p>
              </div>
            ) : (
              <div className="flex justify-between sm:block">
                <span className="text-ink/55">Change</span>
                <p className="font-semibold tabular">{formatPHP(sale.changeCents)}</p>
              </div>
            )}
            <div className="flex justify-between sm:block">
              <span className="text-ink/55">Status</span>
              <p className="font-semibold">{sale.status}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onReprint}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
            >
              <Printer className="h-3.5 w-3.5" /> Reprint receipt
            </button>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${SYNC_STYLE[sale.syncStatus]}`}
            >
              {sale.syncStatus === "FAILED" && <TriangleAlert className="h-3.5 w-3.5" />}
              {sale.syncStatus === "PENDING" && <CloudOff className="h-3.5 w-3.5" />}
              {sale.syncStatus === "SYNCED" && <RefreshCw className="h-3.5 w-3.5" />}
              {sale.syncStatus}
            </span>
            {sale.syncError && (
              <span className="text-xs text-berry">{sale.syncError}</span>
            )}
            {sale.syncStatus !== "SYNCED" && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
              >
                Retry sync
              </button>
            )}
            {sale.syncStatus === "SYNCED" &&
              sale.status === "COMPLETED" &&
              sale.serverId && (
                <button
                  type="button"
                  onClick={onRequestVoid}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold text-berry transition hover:border-berry"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Void / return
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
