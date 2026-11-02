"use client";

import { useState } from "react";
import { Plus, ScanLine, Trash2, X } from "lucide-react";
import {
  FloatingInput,
  FloatingSelect,
} from "@/components/ui/FloatingField";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import type { LocalProduct } from "@/lib/db";
import type { NewProductInput } from "@/lib/products-api";

function fromBase(base: number): string {
  if (!base) return "";
  return base % 1000 === 0 && base > 1 ? String(base / 1000) : String(base);
}

export function ProductForm({
  initial,
  busy,
  categories = [],
  onSubmit,
  onClose,
}: {
  initial: LocalProduct | null;
  busy: boolean;
  categories?: string[];
  onSubmit: (input: NewProductInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [kind, setKind] = useState<"PIECE" | "WEIGHT" | "VOLUME">(
    initial?.kind ?? "PIECE",
  );
  const [basePrice, setBasePrice] = useState(
    initial ? (initial.basePriceCents / 100).toString() : "",
  );
  const [stock, setStock] = useState(
    initial ? fromBase(initial.stockBaseUnits) : "",
  );
  const [cost, setCost] = useState(
    initial ? (initial.costPerBaseCents / 100).toString() : "",
  );
  const [lowStockAt, setLowStockAt] = useState(
    initial?.lowStockAt ? String(initial.lowStockAt) : "",
  );
  const [units, setUnits] = useState(
    (initial?.units ?? []).map((unit) => ({
      id: unit.id,
      label: unit.label,
      qty: fromBase(unit.quantityBase),
      price: unit.priceCents === null ? "" : (unit.priceCents / 100).toString(),
    })),
  );

  const measured = kind !== "PIECE";
  const unitWord = kind === "WEIGHT" ? "kg" : kind === "VOLUME" ? "L" : "pieces";

  function addUnitRow() {
    setUnits((current) => [
      ...current,
      { id: crypto.randomUUID(), label: "", qty: "", price: "" },
    ]);
  }

  function updateUnitRow(id: string, patch: Partial<{ label: string; qty: string; price: string }>) {
    setUnits((current) =>
      current.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
    );
  }

  function removeUnitRow(id: string) {
    setUnits((current) => current.filter((unit) => unit.id !== id));
  }

  function handleSubmit() {
    const basePriceCents = Math.round(Number(basePrice) * 100);
    const costPerBaseCents = cost.trim() ? Math.round(Number(cost) * 100) : 0;
    const stockBaseUnits = stock.trim()
      ? kind === "PIECE"
        ? Math.round(Number(stock))
        : Math.round(Number(stock) * 1000)
      : 0;

    const payload = {
      sku: sku.trim(),
      barcode: barcode.trim() || null,
      name: name.trim(),
      category: category.trim() || "General",
      kind,
      basePriceCents,
      stockBaseUnits,
      costPerBaseCents,
      lowStockAt: lowStockAt.trim() ? Math.round(Number(lowStockAt)) : 0,
      units: units
        .filter((unit) => unit.label.trim() && Number(unit.qty) > 0)
        .map((unit) => ({
          id: unit.id,
          label: unit.label.trim(),
          quantityBase:
            kind === "PIECE"
              ? Math.round(Number(unit.qty))
              : Math.round(Number(unit.qty) * 1000),
          priceCents: unit.price.trim()
            ? Math.round(Number(unit.price) * 100)
            : null,
        })),
      active: initial?.active ?? true,
    };

    onSubmit(payload);
  }

  const formInvalid =
    !name.trim() || !sku.trim() || !basePrice.trim() || Number(basePrice) <= 0;

  return (
    <>
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-ink/10 bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {initial ? "Edit product" : "New product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-icon btn-sm text-ink/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <FloatingInput label="Product name" value={name} onChange={setName} />
          <FloatingInput label="SKU / code" value={sku} onChange={setSku} />
          <div className="flex items-center gap-2">
            <FloatingInput
              label="Barcode (optional)"
              value={barcode}
              onChange={setBarcode}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="btn btn-secondary btn-icon shrink-0"
              title="Scan barcode or QR code"
              aria-label="Scan barcode or QR code"
            >
              <ScanLine className="h-4 w-4" />
            </button>
          </div>
          <FloatingSelect label="Category" value={category} onChange={setCategory}>
            {[...categories.filter((item) => item !== "All"), "General"].filter((item, index, list) => list.indexOf(item) === index).map((item) => <option key={item} value={item}>{item}</option>)}
          </FloatingSelect>
          <FloatingSelect label="Selling type" value={kind} onChange={(value) => setKind(value as "PIECE" | "WEIGHT" | "VOLUME")}>
            <option value="PIECE">Per piece (tingi)</option>
            <option value="WEIGHT">By weight (kilo)</option>
            <option value="VOLUME">By volume (liter)</option>
          </FloatingSelect>
          <FloatingInput
            label={measured ? "Price per kilo/liter (₱)" : "Price per piece (₱)"}
            value={basePrice}
            onChange={setBasePrice}
            inputMode="decimal"
          />
          <FloatingInput
            label={`Stock (${unitWord})`}
            value={stock}
            onChange={setStock}
            inputMode="decimal"
          />
          <FloatingInput
            label={measured ? "Cost per kilo/liter (₱)" : "Cost per piece (₱)"}
            value={cost}
            onChange={setCost}
            inputMode="decimal"
          />
          <FloatingInput
            label={
              measured ? "Low-stock alert (grams/mL)" : "Low-stock alert (pieces)"
            }
            value={lowStockAt}
            onChange={setLowStockAt}
            inputMode="numeric"
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink/50">
              Tingi / bundle presets
            </h3>
            <button
              type="button"
              onClick={addUnitRow}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 px-3 py-1.5 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
            >
              <Plus className="h-3.5 w-3.5" /> Add preset
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/50">
            e.g. a sachet worth 10 grams, a case of 24, a sack of 25 kg. Price is optional.
          </p>

          <div className="mt-3 space-y-2">
            {units.map((unit) => (
              <div key={unit.id} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl border border-ink/10 p-3 sm:grid-cols-[1.4fr_0.8fr_0.9fr_auto]">
                <FloatingInput
                  label="Label"
                  value={unit.label}
                  onChange={(value) => updateUnitRow(unit.id, { label: value })}
                />
                <FloatingInput
                  label={measured ? `Amount (${unitWord})` : "Pieces"}
                  value={unit.qty}
                  onChange={(value) => updateUnitRow(unit.id, { qty: value })}
                  inputMode="decimal"
                />
                <FloatingInput
                  label="Price (₱)"
                  value={unit.price}
                  onChange={(value) => updateUnitRow(unit.id, { price: value })}
                  inputMode="decimal"
                />
                <button
                  type="button"
                  onClick={() => removeUnitRow(unit.id)}
                  className="mb-1 grid h-9 w-9 place-items-center rounded-xl text-berry transition hover:bg-berry/10"
                  aria-label="Remove preset"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {units.length === 0 && (
              <p className="rounded-2xl border border-dashed border-ink/15 p-4 text-center text-xs text-ink/50">
                No presets yet. Add one for tingi sold per sachet or per spoon.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy || formInvalid}
            onClick={handleSubmit}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy ? "Saving…" : initial ? "Save changes" : "Add product"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    {scannerOpen && (
      <BarcodeScanner
        onDetected={(code) => {
          setBarcode(code);
          setScannerOpen(false);
        }}
        onClose={() => setScannerOpen(false)}
      />
    )}
    </>
  );
}
