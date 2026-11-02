"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { FloatingInput } from "@/components/ui/FloatingField";
import type { LocalProduct } from "@/lib/db";
import {
  baseUnitInfo,
  isMeasured,
  openPriceToQuantity,
  priceForQuantity,
} from "@/lib/pricing";
import { formatPHP, formatQuantity } from "@/lib/format";

export type SellSelection = {
  quantityBase: number;
  unitLabel: string | null;
};

export function SellSheet({
  product,
  onClose,
  onAdd,
}: {
  product: LocalProduct;
  onClose: () => void;
  onAdd: (selection: SellSelection) => void;
}) {
  const [customQty, setCustomQty] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const info = baseUnitInfo(product.kind);
  const measured = isMeasured(product.kind);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const customNumber = Number(customQty);
  const customValid =
    Number.isSafeInteger(customNumber) &&
    customNumber > 0 &&
    customNumber <= product.stockBaseUnits;

  const openNumber = Number(openPrice);
  const openValid = measured && Number.isFinite(openNumber) && openNumber > 0;
  const openQuantity = openValid
    ? openPriceToQuantity(product, Math.round(openNumber * 100))
    : 0;

  function add(selection: SellSelection) {
    onAdd(selection);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-ink/10 bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="mt-0.5 text-sm text-ink/55">
              {product.sku} · {formatPHP(product.basePriceCents)} {info.pricePer} ·{" "}
              {formatQuantity(product.kind, product.stockBaseUnits)} left
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-icon btn-sm text-ink/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {product.units.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Quick presets
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {product.units.map((unit) => {
                const disabled = unit.quantityBase > product.stockBaseUnits;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      add({ quantityBase: unit.quantityBase, unitLabel: unit.label })
                    }
                    className="rounded-2xl border border-ink/10 bg-cream/60 px-3 py-3 text-left transition hover:border-leaf hover:bg-leaf/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="block text-sm font-semibold">{unit.label}</span>
                    <span className="block text-[11px] text-ink/55">
                      {formatPHP(priceForQuantity(product, unit.quantityBase))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 p-3">
            <FloatingInput
              label={measured ? `Custom ${info.unit}` : "Custom pieces"}
              value={customQty}
              onChange={setCustomQty}
              inputMode="decimal"
              hint={
                customValid
                  ? `= ${formatQuantity(product.kind, customNumber)} · ${formatPHP(
                      priceForQuantity(product, customNumber),
                    )}`
                  : measured && customNumber > 0
                    ? "Exceeds available stock"
                    : `Stock: ${formatQuantity(product.kind, product.stockBaseUnits)}`
              }
            />
            <button
              type="button"
              disabled={!customValid}
              onClick={() => add({ quantityBase: customNumber, unitLabel: null })}
              className="btn btn-primary btn-sm mt-2 w-full"
            >
              <Plus className="h-4 w-4" />
              Add custom
            </button>
          </div>

          {measured && (
            <div className="rounded-2xl border border-mango/30 bg-mango/5 p-3">
              <FloatingInput
                label="Open price (₱)"
                value={openPrice}
                onChange={setOpenPrice}
                inputMode="decimal"
                hint={
                  openValid
                    ? `≈ ${formatQuantity(product.kind, openQuantity)}`
                    : "Sell an amount instead of a weight"
                }
              />
              <button
                type="button"
                disabled={!openValid}
                onClick={() =>
                  add({ quantityBase: openQuantity, unitLabel: "open price" })
                }
                className="btn btn-gold btn-sm mt-2 w-full"
              >
                <Plus className="h-4 w-4" />
                Add open price
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
