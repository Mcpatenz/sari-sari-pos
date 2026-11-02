"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Package,
  PackageMinus,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { ProductForm } from "@/components/pos/ProductForm";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import type { LocalProduct } from "@/lib/db";
import { listCategories } from "@/lib/categories-api";
import type { NewProductInput } from "@/lib/products-api";
import {
  adjustCentralStock,
  archiveCentralProduct,
  createCentralProduct,
  updateCentralProduct,
} from "@/lib/products-api";
import { formatPHP, formatQuantity } from "@/lib/format";

const KIND_LABEL: Record<LocalProduct["kind"], string> = {
  PIECE: "Per piece",
  WEIGHT: "Per kilo",
  VOLUME: "Per liter",
};

function demoProducts(): NewProductInput[] {
  return [
    {
      sku: "SKY-1L-130",
      barcode: null,
      name: "Coke 1.5L",
      category: "Drinks",
      kind: "VOLUME",
      basePriceCents: 9000,
      stockBaseUnits: 12000,
      costPerBaseCents: 7200,
      lowStockAt: 2000,
      units: [
        { id: crypto.randomUUID(), label: "1.5L bottle", quantityBase: 1500, priceCents: 9000 },
      ],
      active: true,
    },
    {
      sku: "SKY-8OZ-CUP",
      barcode: null,
      name: "Skyflakes 8oz",
      category: "Snacks",
      kind: "WEIGHT",
      basePriceCents: 30000,
      stockBaseUnits: 4000,
      costPerBaseCents: 25000,
      lowStockAt: 500,
      units: [
        { id: crypto.randomUUID(), label: "Tingi ¼", quantityBase: 250, priceCents: 8000 },
        { id: crypto.randomUUID(), label: "Sack 2kg", quantityBase: 2000, priceCents: 58000 },
      ],
      active: true,
    },
    {
      sku: "SKY-PIAYA",
      barcode: null,
      name: "Piattos",
      category: "Snacks",
      kind: "PIECE",
      basePriceCents: 1000,
      stockBaseUnits: 200,
      costPerBaseCents: 700,
      lowStockAt: 24,
      units: [
        { id: crypto.randomUUID(), label: "Barcode pack", quantityBase: 12, priceCents: 10000 },
      ],
      active: true,
    },
  ];
}

export function ProductsView() {
  const { toast } = useToast();
  const products = useLiveQuery(
    () => db.products.orderBy("name").toArray(),
    [],
    [],
  ) as LocalProduct[];

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<LocalProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState<LocalProduct | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listCategories()
      .then((list) => {
        if (active) setManagedCategories(list.map((item) => item.name));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["General", ...managedCategories]);
    products.forEach((product) => {
      if (product.category) set.add(product.category);
    });
    return [
      "All",
      ...[...set].sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      ),
    ];
  }, [products, managedCategories]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (!term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term)),
    );
  }, [products, search, category]);

  async function save(input: NewProductInput) {
    setBusy(true);
    try {
      if (editing) {
        await updateCentralProduct(editing.id, input);
        toast({ title: `${input.name} updated`, variant: "success" });
      } else {
        await createCentralProduct(input);
        toast({ title: `${input.name} added`, variant: "success" });
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      toast({
        title: "Could not save product",
        description:
          error instanceof Error ? error.message : "Check your connection.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setBusy(true);
    try {
      for (const product of demoProducts()) {
        await createCentralProduct(product);
      }
      toast({ title: "Demo products loaded", variant: "success" });
    } catch (error) {
      toast({
        title: "Could not load demo products",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(product: LocalProduct) {
    setRowBusy(product.id);
    try {
      if (product.active) {
        await archiveCentralProduct(product.id);
        toast({ title: `${product.name} archived`, variant: "success" });
      } else {
        // Restore: resubmit the record unchanged with active flipped back on.
        await updateCentralProduct(product.id, {
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          kind: product.kind,
          basePriceCents: product.basePriceCents,
          stockBaseUnits: product.stockBaseUnits,
          costPerBaseCents: product.costPerBaseCents,
          lowStockAt: product.lowStockAt,
          units: product.units,
          active: true,
        });
        toast({ title: `${product.name} restored`, variant: "success" });
      }
    } catch (error) {
      toast({
        title: "Could not update the product",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
            <p className="text-sm text-ink/55">
              Inventory shared across every device in your store.
            </p>
          </div>
          <div className="flex gap-2">
            {products.length === 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadDemo()}
                className="inline-flex items-center gap-2 rounded-2xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-mango hover:text-mango disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" /> Load demo products
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" /> Add product
            </button>
          </div>
        </div>

        <div className="card mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
                className="w-full rounded-2xl border border-ink/12 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    category === item
                      ? "bg-ink text-cream"
                      : "border border-ink/10 bg-white text-ink/60 hover:border-ink/25"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink/45">
                  <th className="pb-2 font-semibold">Product</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 text-right font-semibold">Price</th>
                  <th className="pb-2 text-right font-semibold">Stock</th>
                  <th className="pb-2 text-right font-semibold">Tingi</th>
                  <th className="pb-2 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const low =
                    product.lowStockAt > 0 &&
                    product.stockBaseUnits <= product.lowStockAt;
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-ink/5 ${
                        product.active ? "" : "opacity-55"
                      }`}
                    >
                      <td className="py-3">
                        <p className="flex items-center gap-2 font-semibold">
                          {product.name}
                          {!product.active && (
                            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/55">
                              Archived
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink/45">
                          {product.sku} · {product.category}
                        </p>
                      </td>
                      <td className="py-3 text-ink/65">
                        {KIND_LABEL[product.kind]}
                      </td>
                      <td className="py-3 text-right tabular">
                        {formatPHP(product.basePriceCents)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            low ? "font-semibold text-berry tabular" : "tabular"
                          }
                        >
                          {formatQuantity(product.kind, product.stockBaseUnits)}
                        </span>
                      </td>
                      <td className="py-3 text-right text-ink/65 tabular">
                        {product.units.length}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjusting(product)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-1.5 text-xs font-semibold transition hover:border-mango hover:text-mango"
                            title="Adjust stock"
                          >
                            <PackageMinus className="h-3.5 w-3.5" /> Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(product);
                              setShowForm(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-1.5 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={rowBusy === product.id}
                            onClick={() => void toggleArchive(product)}
                            className="grid h-8 w-8 place-items-center rounded-xl border border-ink/12 text-ink/55 transition hover:border-berry hover:text-berry disabled:opacity-50"
                            title={product.active ? "Archive" : "Restore"}
                            aria-label={product.active ? "Archive" : "Restore"}
                          >
                            {rowBusy === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : product.active ? (
                              <Archive className="h-3.5 w-3.5" />
                            ) : (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                  <Package className="h-5 w-5" />
                </span>
                <p className="text-sm text-ink/55">
                  {products.length === 0
                    ? "No products yet. Add your first item, or load the demo set."
                    : "No products match your search."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <ProductForm
          initial={editing}
          busy={busy}
          categories={categories}
          onSubmit={(input) => void save(input)}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {adjusting && (
        <StockAdjustForm
          product={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </>
  );
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <ProductsView />
    </div>
  );
}

function StockAdjustForm({
  product,
  onClose,
}: {
  product: LocalProduct;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const unit = product.kind === "PIECE" ? "pieces" : product.kind === "VOLUME" ? "L" : "kg";
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  async function submit() {
    const base =
      product.kind === "PIECE"
        ? Math.round(parsed)
        : Math.round(parsed * 1000);
    if (base <= 0) return;
    setBusy(true);
    try {
      await adjustCentralStock({
        productId: product.id,
        quantityBase: direction === "add" ? base : -base,
        note: note.trim() || undefined,
      });
      toast({ title: `${product.name} stock updated`, variant: "success" });
      onClose();
    } catch (error) {
      toast({
        title: "Could not adjust stock",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Adjust ${product.name}`}
      subtitle={`Current stock: ${formatQuantity(product.kind, product.stockBaseUnits)}`}
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void submit();
        }}
      >
        <div className="flex rounded-2xl border border-ink/12 p-1">
          {(["add", "remove"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDirection(item)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition ${
                direction === item ? "bg-ink text-cream" : "text-ink/60"
              }`}
            >
              {item === "add" ? "Add stock" : "Remove / write-off"}
            </button>
          ))}
        </div>

        <FloatingInput
          label={`Amount (${unit})`}
          value={amount}
          onChange={setAmount}
          inputMode="decimal"
        />
        <FloatingInput
          label="Reason (optional)"
          value={note}
          onChange={setNote}
        />

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={busy || !valid}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {direction === "add" ? "Add stock" : "Remove stock"}
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
