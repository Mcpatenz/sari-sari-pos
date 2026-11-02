"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, User, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatPHP, pesoInputToCents } from "@/lib/format";

export type RepaySale = {
  id: string;
  receiptNumber: string;
  totalCents: number;
  collectedCents: number;
  customer: {
    name: string;
    customerId: string;
    photoUrl?: string | null;
  } | null;
};

type RepayResult = { paid: boolean; remainingCents: number };

function presetsFor(remainingCents: number) {
  const options = [
    { label: "Full balance", cents: remainingCents },
    { label: "Half", cents: Math.ceil(remainingCents / 2) },
    { label: "₱100", cents: 10_000 },
    { label: "₱50", cents: 5_000 },
  ];

  return options.filter(
    (option, index, list) =>
      option.cents > 0 &&
      option.cents <= remainingCents &&
      list.findIndex((item) => item.cents === option.cents) === index,
  );
}

export function RepayModal({
  sale,
  onClose,
  onPaid,
}: {
  sale: RepaySale;
  onClose: () => void;
  onPaid: (result: RepayResult) => void;
}) {
  const remainingCents = Math.max(0, sale.totalCents - sale.collectedCents);
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amountCents = pesoInputToCents(amount);
  const paidPercent = sale.totalCents
    ? Math.min(100, Math.round((sale.collectedCents / sale.totalCents) * 100))
    : 0;
  const nextBalance =
    amountCents === null ? remainingCents : Math.max(0, remainingCents - amountCents);
  const presets = presetsFor(remainingCents);

  let amountError: string | null = null;
  if (amount.trim() !== "") {
    if (amountCents === null) amountError = "Enter a valid amount, like 150.00.";
    else if (amountCents <= 0) amountError = "Enter an amount greater than zero.";
    else if (amountCents > remainingCents)
      amountError = `That is more than the ${formatPHP(remainingCents)} balance.`;
  }

  const canSubmit = !busy && amountCents !== null && amountCents > 0 && amountCents <= remainingCents;

  async function submit() {
    if (!canSubmit || amountCents === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/utang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, amountCents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not record the payment.");
      onPaid({ paid: Boolean(data.paid), remainingCents: Number(data.remainingCents) || 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Repay utang"
      subtitle={`Receipt ${sale.receiptNumber}`}
      onClose={onClose}
    >
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-ink-soft p-5 text-cream">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-cream/70">
            {sale.customer?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sale.customer.photoUrl} alt="" className="h-11 w-11 object-cover" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-cream/50">Customer</p>
            <p className="truncate font-semibold">{sale.customer?.name ?? "Walk-in customer"}</p>
            <p className="truncate text-xs text-cream/45">ID {sale.customer?.customerId ?? "—"}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-mango/30 bg-mango/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-mango">
            {sale.collectedCents > 0 ? "Partially paid" : "Unpaid"}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-cream/50">Balance due</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular">{formatPHP(remainingCents)}</p>
          </div>
          <div className="text-right text-xs text-cream/50">
            <p>Total {formatPHP(sale.totalCents)}</p>
            <p>Paid {formatPHP(sale.collectedCents)}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-leaf to-mango transition-[width] duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-cream/45">{paidPercent}% collected</p>
        </div>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="repay-amount" className="text-sm font-semibold text-ink/70">
          Amount to collect
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-ink/40">
            ₱
          </span>
          <input
            id="repay-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="decimal"
            autoFocus
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? "repay-error" : "repay-preview"}
            className={`w-full rounded-2xl border bg-white py-3.5 pl-9 pr-4 text-2xl font-bold tabular text-ink outline-none transition focus:ring-4 ${
              amountError
                ? "border-berry/40 focus:border-berry focus:ring-berry/10"
                : "border-ink/10 focus:border-ink/30 focus:ring-ink/5"
            }`}
          />
        </div>

        {presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={`${preset.label}-${preset.cents}`}
                type="button"
                onClick={() => setAmount((preset.cents / 100).toFixed(2))}
                className={`btn btn-xs rounded-full ${
                  amountCents === preset.cents ? "btn-primary" : "btn-secondary"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div id="repay-preview" className="mt-4 rounded-2xl border border-ink/10 bg-cream/50 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink/55">Remaining after this payment</span>
            <span className="font-bold tabular">{formatPHP(nextBalance)}</span>
          </div>
          {amountCents !== null && amountCents > 0 && amountCents <= remainingCents && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-leaf">
              {nextBalance === 0 ? (
                <>
                  <Check className="h-3.5 w-3.5" /> This settles the utang in full
                </>
              ) : (
                <>
                  <Wallet className="h-3.5 w-3.5" /> {formatPHP(amountCents)} will be recorded
                </>
              )}
            </p>
          )}
        </div>

        {(amountError || error) && (
          <p id="repay-error" role="alert" className="mt-3 rounded-xl border border-berry/20 bg-berry/10 px-3 py-2 text-sm font-medium text-berry">
            {amountError ?? error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="btn btn-leaf flex-[1.4]">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Recording…
              </>
            ) : (
              <>
                Record payment <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
