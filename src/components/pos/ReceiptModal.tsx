"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getMeta, getStoreProfile } from "@/lib/db";
import type { LocalSale, LocalSaleItem, StoreProfile } from "@/lib/db";
import { formatPHP, formatQuantity } from "@/lib/format";

/**
 * The printable receipt. Shared by the cashier (right after a sale) and by the
 * Sales history (to reprint a past sale). Store branding comes from the cached
 * profile so it renders with or without a connection.
 */
export function ReceiptModal({
  sale,
  items,
  onClose,
}: {
  sale: LocalSale;
  items: LocalSaleItem[];
  onClose: () => void;
}) {
  const profile = useLiveQuery(() => getStoreProfile(), [], null) as StoreProfile | null;
  // Sales made before cashier names were recorded fall back to the name of
  // the account signed in on this device (the offline cache is wiped on logout).
  const cachedName = useLiveQuery(() => getMeta("userName"), [], null) as string | null;
  const cashierName = sale.cashierName ?? cachedName;
  const hasContact = Boolean(profile?.address || profile?.phone);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="receipt-print max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]">
        <div className="text-center">
          <p className="text-lg font-black tracking-tight">
            {profile?.name ?? "TindahanPOS"}
          </p>
          {profile?.address && (
            <p className="text-xs text-ink/55">{profile.address}</p>
          )}
          {profile?.phone && (
            <p className="text-xs text-ink/55">Tel: {profile.phone}</p>
          )}
          {!hasContact && (
            <p className="text-sm text-ink/55">Sari-sari store receipt</p>
          )}
          <p className="mt-2 text-sm font-semibold">{sale.receiptNumber}</p>
          <p className="text-xs text-ink/50">
            {new Date(sale.createdAt).toLocaleString("en-PH")}
          </p>
          {cashierName && (
            <p className="mt-1 text-xs text-ink/55">Cashier: {cashierName}</p>
          )}
        </div>

        <div className="my-5 space-y-3 border-y border-dashed border-ink/20 py-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-ink/55">
                  {formatQuantity(item.kind, item.quantityBase)}
                  {item.unitLabel ? ` · ${item.unitLabel}` : ""}
                </p>
              </div>
              <span className="tabular">{formatPHP(item.lineTotalCents)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total</span>
            <strong className="tabular">{formatPHP(sale.totalCents)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span className="font-semibold">
              {sale.paymentMethod === "GCASH"
                ? "GCash"
                : sale.paymentMethod === "UTANG"
                  ? "Utang"
                  : "Cash"}
            </span>
          </div>
          {sale.paymentMethod === "GCASH" && sale.referenceNumber && (
            <div className="flex justify-between">
              <span>GCash ref no.</span>
              <span className="tabular">{sale.referenceNumber}</span>
            </div>
          )}
          {sale.paymentMethod !== "GCASH" && sale.paymentMethod !== "UTANG" && (
            <>
              <div className="flex justify-between">
                <span>Cash received</span>
                <span className="tabular">{formatPHP(sale.cashReceivedCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span>
                <strong className="tabular text-leaf">
                  {formatPHP(sale.changeCents)}
                </strong>
              </div>
            </>
          )}
        </div>

        {sale.status !== "COMPLETED" && (
          <p className="mt-4 rounded-xl bg-berry/10 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-berry">
            {sale.status === "VOIDED" ? "Voided" : "Returned"}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-ink/50">
          Salamat sa pagtangkilik!
        </p>

        <div className="mt-5 flex gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary flex-1"
          >
            Print receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-ink/15 px-4 py-3 font-semibold transition hover:bg-ink/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
