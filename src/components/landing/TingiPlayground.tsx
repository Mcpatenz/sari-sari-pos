"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { FloatingInput } from "@/components/ui/FloatingField";
import {
  baseUnitInfo,
  openPriceToQuantity,
  priceForQuantity,
  type ProductKind,
  type SellingUnit,
} from "@/lib/pricing";
import { formatPHP, formatQuantity } from "@/lib/format";

type DemoProduct = {
  key: string;
  name: string;
  emoji: string;
  kind: ProductKind;
  basePriceCents: number;
  stockBaseUnits: number;
  units: SellingUnit[];
  customLabel: string;
  step: number;
};

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    key: "cigarette",
    name: "Cigarettes",
    emoji: "🚬",
    kind: "PIECE",
    basePriceCents: 400,
    stockBaseUnits: 200,
    customLabel: "Custom sticks",
    step: 1,
    units: [
      { id: "c1", label: "1 pc", quantityBase: 1, priceCents: null },
      { id: "c3", label: "3 pcs", quantityBase: 3, priceCents: 1000 },
      { id: "c20", label: "1 pack", quantityBase: 20, priceCents: 7500 },
    ],
  },
  {
    key: "candy",
    name: "Candy",
    emoji: "🍬",
    kind: "PIECE",
    basePriceCents: 300,
    stockBaseUnits: 60,
    customLabel: "Custom pieces",
    step: 1,
    units: [
      { id: "k1", label: "1 pc", quantityBase: 1, priceCents: null },
      { id: "k2", label: "2 pcs", quantityBase: 2, priceCents: 500 },
      { id: "k10", label: "10 pcs", quantityBase: 10, priceCents: 2200 },
    ],
  },
  {
    key: "rice",
    name: "Rice",
    emoji: "🍚",
    kind: "WEIGHT",
    basePriceCents: 6000,
    stockBaseUnits: 25000,
    customLabel: "Custom grams",
    step: 50,
    units: [
      { id: "r250", label: "¼ kg", quantityBase: 250, priceCents: null },
      { id: "r500", label: "½ kg", quantityBase: 500, priceCents: null },
      { id: "r1000", label: "1 kg", quantityBase: 1000, priceCents: null },
      { id: "r25000", label: "1 sack", quantityBase: 25000, priceCents: 140000 },
    ],
  },
  {
    key: "feeds",
    name: "Feeds",
    emoji: "🐔",
    kind: "WEIGHT",
    basePriceCents: 3200,
    stockBaseUnits: 50000,
    customLabel: "Custom grams",
    step: 100,
    units: [
      { id: "f500", label: "½ kg", quantityBase: 500, priceCents: null },
      { id: "f5000", label: "5 kg", quantityBase: 5000, priceCents: null },
      { id: "f50000", label: "1 sack (50kg)", quantityBase: 50000, priceCents: 150000 },
    ],
  },
];

type CartLine = { productKey: string; quantityBase: number; unitLabel: string | null };

export function TingiPlayground() {
  const { toast } = useToast();
  const [activeKey, setActiveKey] = useState(DEMO_PRODUCTS[0].key);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [stock, setStock] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEMO_PRODUCTS.map((p) => [p.key, p.stockBaseUnits])),
  );
  const [customQty, setCustomQty] = useState("");
  const [openPrice, setOpenPrice] = useState("");

  const active = DEMO_PRODUCTS.find((p) => p.key === activeKey) as DemoProduct;
  const info = baseUnitInfo(active.kind);

  const cartDetails = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = DEMO_PRODUCTS.find((p) => p.key === line.productKey);
        if (!product) return [];
        return [
          {
            ...line,
            product,
            lineTotalCents: priceForQuantity(product, line.quantityBase),
          },
        ];
      }),
    [cart],
  );

  const totalCents = cartDetails.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const itemCount = cartDetails.reduce((sum, line) => sum + line.quantityBase, 0);

  function addToCart(quantityBase: number, unitLabel: string | null, showLabel: string) {
    if (!Number.isSafeInteger(quantityBase) || quantityBase <= 0) {
      toast({ title: "Enter a valid quantity.", variant: "warning" });
      return;
    }

    const remaining = stock[active.key] ?? 0;
    if (quantityBase > remaining) {
      toast({
        title: "Not enough stock",
        description: `Only ${formatQuantity(active.kind, remaining)} of ${active.name} left.`,
        variant: "error",
      });
      return;
    }

    const lineTotal = formatPHP(priceForQuantity(active, quantityBase));

    setCart((current) => {
      const existing = current.find((line) => line.productKey === active.key);
      if (!existing) return [...current, { productKey: active.key, quantityBase, unitLabel }];
      return current.map((line) =>
        line.productKey === active.key
          ? { ...line, quantityBase: line.quantityBase + quantityBase, unitLabel: null }
          : line,
      );
    });

    const nextStock = remaining - quantityBase;
    setStock((current) => ({ ...current, [active.key]: nextStock }));

    toast({
      title: `Added ${showLabel}`,
      description: `${active.name} · ${lineTotal}${
        nextStock === 0 ? " · out of stock" : ""
      }`,
      variant: "success",
      duration: 2600,
    });
  }

  function addCustom() {
    const qty = Number(customQty);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      toast({ title: "Quantity must be a whole number.", variant: "warning" });
      return;
    }
    addToCart(qty, null, formatQuantity(active.kind, qty));
    setCustomQty("");
  }

  function addOpenPrice() {
    if (active.kind === "PIECE") {
      toast({ title: "Open price is for weighed items.", variant: "info" });
      return;
    }
    const pesos = Number(openPrice);
    if (!Number.isFinite(pesos) || pesos <= 0) {
      toast({ title: "Enter an amount like 20.00", variant: "warning" });
      return;
    }
    const cents = Math.round(pesos * 100);
    const qty = openPriceToQuantity(active, cents);
    addToCart(qty, "open", `₱${openPrice} worth`);
  }

  function reset() {
    setCart([]);
    setStock(Object.fromEntries(DEMO_PRODUCTS.map((p) => [p.key, p.stockBaseUnits])));
    setCustomQty("");
    setOpenPrice("");
    toast({ title: "Playground reset", variant: "info" });
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-ink text-cream shadow-[0_40px_80px_-40px_rgba(7,12,24,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-mango text-ink">
            <ShoppingCart className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Tingi Mode playground</p>
            <p className="text-xs text-cream/60">
              Tap a preset, type a quantity, or sell an open price.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-cream/80 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_PRODUCTS.map((product) => {
              const isActive = product.key === active.key;
              const remaining = stock[product.key] ?? 0;
              return (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => {
                    setActiveKey(product.key);
                    setCustomQty("");
                    setOpenPrice("");
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-mango bg-mango/15"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <span className="text-lg">{product.emoji}</span>
                  <span className="mt-1 block text-sm font-semibold">{product.name}</span>
                  <span className="mt-0.5 block text-[11px] text-cream/60">
                    {formatPHP(product.basePriceCents)}{" "}
                    {product.kind === "PIECE" ? "/ pc" : product.kind === "VOLUME" ? "/ L" : "/ kg"}
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-leaf transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          0,
                          (remaining / product.stockBaseUnits) * 100,
                        )}%`,
                      }}
                    />
                  </span>
                  <span className="mt-1 block text-[10px] text-cream/50">
                    {formatQuantity(product.kind, remaining)} left
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream/50">
              Presets for {active.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {active.units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() =>
                    addToCart(unit.quantityBase, unit.label, unit.label)
                  }
                  className="group rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-left transition hover:border-leaf hover:bg-leaf/10"
                >
                  <span className="block text-sm font-semibold">{unit.label}</span>
                  <span className="block text-[11px] text-cream/60">
                    {formatPHP(priceForQuantity(active, unit.quantityBase))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <FloatingInput
                  label={active.customLabel}
                  value={customQty}
                  onChange={setCustomQty}
                  inputMode="decimal"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream text-ink transition hover:bg-mango"
                  aria-label="Add custom quantity"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[11px] text-cream/50">
                1 {info.unit} today · sold in {info.unit} behind the scenes
              </p>
            </div>

            {active.kind !== "PIECE" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <FloatingInput
                    label="Open price amount (₱)"
                    value={openPrice}
                    onChange={setOpenPrice}
                    inputMode="decimal"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addOpenPrice}
                    className="btn btn-gold btn-icon mt-1 shrink-0"
                    aria-label="Add open price"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1.5 px-1 text-[11px] text-cream/50">
                  &ldquo;{formatPHP(2000)} worth of rice&rdquo; → converts to weight
                  automatically
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold">Current sale</p>
              <p className="text-xs text-cream/60">{cart.length} line(s)</p>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto p-3">
              {cartDetails.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-cream/50">
                  Tap a preset or add a quantity to see pricing in action.
                </p>
              )}
              {cartDetails.map((line) => (
                <div
                  key={line.productKey}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {line.product.emoji} {line.product.name}
                    </p>
                    <p className="text-[11px] text-cream/60">
                      {formatQuantity(line.product.kind, line.quantityBase)}
                      {line.unitLabel ? ` · ${line.unitLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm font-semibold">
                      {formatPHP(line.lineTotalCents)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${line.product.name}`}
                      onClick={() => {
                        setStock((current) => ({
                          ...current,
                          [line.productKey]:
                            (current[line.productKey] ?? 0) + line.quantityBase,
                        }));
                        setCart((current) =>
                          current.filter((item) => item.productKey !== line.productKey),
                        );
                      }}
                      className="rounded-lg p-1 text-cream/50 transition hover:bg-white/10 hover:text-berry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-cream/50">
                  Total
                </p>
                <p className="text-[11px] text-cream/40">{itemCount} base units</p>
              </div>
              <p className="text-2xl font-bold tabular text-mango">
                {formatPHP(totalCents)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
