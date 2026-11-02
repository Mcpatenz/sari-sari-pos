"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Loader2,
  PackagePlus,
  Plus,
  Power,
  Truck,
  Trash2,
} from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput, FloatingSelect } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import type { LocalProduct } from "@/lib/db";
import { refreshProductsFromServer } from "@/lib/products-api";
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
  type ApiSupplier,
} from "@/lib/suppliers-api";
import { createPurchase, listPurchases, type ApiPurchase } from "@/lib/purchases-api";
import { formatPHP, formatDate, formatQuantity, pesoInputToCents } from "@/lib/format";

export function SuppliersView() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [purchases, setPurchases] = useState<ApiPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ApiSupplier | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [supplierList, purchaseList] = await Promise.all([
        listSuppliers(),
        listPurchases(),
      ]);
      setSuppliers(supplierList);
      setPurchases(purchaseList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load suppliers.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [supplierList, purchaseList] = await Promise.all([
          listSuppliers(),
          listPurchases(),
        ]);
        if (active) {
          setSuppliers(supplierList);
          setPurchases(purchaseList);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load suppliers.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggleSupplier(supplier: ApiSupplier) {
    try {
      await updateSupplier(supplier.id, { active: !supplier.active });
      await reload();
    } catch (err) {
      toast({
        title: "Could not update supplier",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Suppliers &amp; purchases
            </h1>
            <p className="text-sm text-ink/55">
              Record stock you buy in. Recording a purchase adds the quantities
              to inventory and updates your cost basis.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setShowSupplierForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-leaf hover:text-leaf"
            >
              <Truck className="h-4 w-4" /> Add supplier
            </button>
            <button
              type="button"
              onClick={() => setShowPurchaseForm(true)}
              className="btn btn-primary btn-sm"
            >
              <PackagePlus className="h-4 w-4" /> Record purchase
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-ink/50">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
            {error}
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink/45">
                Suppliers
              </h2>
              <div className="mt-3 space-y-2">
                {suppliers.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/50">
                    No suppliers yet.
                  </p>
                )}
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`card flex items-center gap-3 p-4 ${
                      supplier.active ? "" : "opacity-60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{supplier.name}</p>
                      <p className="truncate text-xs text-ink/50">
                        {supplier.phone || supplier.note || "No contact details"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setShowSupplierForm(true);
                      }}
                      className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleSupplier(supplier)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink/50 transition hover:bg-ink/5"
                      aria-label={supplier.active ? "Deactivate" : "Activate"}
                      title={supplier.active ? "Deactivate" : "Activate"}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink/45">
                Recent purchases
              </h2>
              <div className="mt-3 space-y-2">
                {purchases.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/50">
                    No purchases recorded yet.
                  </p>
                )}
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {purchase.supplier?.name ?? "Walk-in supplier"}
                        </p>
                        <p className="text-xs text-ink/50">
                          {formatDate(purchase.createdAt)} · {purchase.items.length} item(s)
                        </p>
                      </div>
                      <span className="font-bold tabular">
                        {formatPHP(purchase.totalCents)}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
                      {purchase.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span className="text-ink/70">{item.productName}</span>
                          <span className="text-ink/50">
                            {formatQuantity(
                              item.product?.kind ?? "PIECE",
                              item.quantityBase,
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {showSupplierForm && (
        <SupplierForm
          initial={editingSupplier}
          onClose={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
          onSaved={async () => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
            await reload();
          }}
        />
      )}

      {showPurchaseForm && (
        <PurchaseForm
          suppliers={suppliers.filter((supplier) => supplier.active)}
          onClose={() => setShowPurchaseForm(false)}
          onSaved={async () => {
            setShowPurchaseForm(false);
            try {
              await refreshProductsFromServer();
            } catch {
              // Best-effort; stock will refresh on the next sync.
            }
            await reload();
          }}
        />
      )}
    </>
  );
}

export default function SuppliersPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <SuppliersView />
    </div>
  );
}

function SupplierForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: ApiSupplier | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);

  const invalid = name.trim().length === 0;

  async function submit() {
    setBusy(true);
    try {
      if (initial) {
        await updateSupplier(initial.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
        });
        toast({ title: "Supplier updated", variant: "success" });
      } else {
        await createSupplier({
          name: name.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
        });
        toast({ title: "Supplier added", variant: "success" });
      }
      await onSaved();
    } catch (err) {
      toast({
        title: "Could not save supplier",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={initial ? "Edit supplier" : "New supplier"}
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) void submit();
        }}
      >
        <FloatingInput label="Supplier name" value={name} onChange={setName} />
        <FloatingInput label="Phone (optional)" value={phone} onChange={setPhone} />
        <FloatingInput label="Note (optional)" value={note} onChange={setNote} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || invalid}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add supplier"}
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

type PurchaseLine = {
  id: string;
  productId: string;
  qty: string;
  lineTotal: string;
};

function PurchaseForm({
  suppliers,
  onClose,
  onSaved,
}: {
  suppliers: ApiSupplier[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const products = useLiveQuery(
    () => db.products.filter((product) => product.active).toArray(),
    [],
    [],
  ) as LocalProduct[];

  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: crypto.randomUUID(), productId: "", qty: "", lineTotal: "" },
  ]);
  const [busy, setBusy] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  function addLine() {
    setLines((current) => [
      ...current,
      { id: crypto.randomUUID(), productId: "", qty: "", lineTotal: "" },
    ]);
  }

  function updateLine(id: string, patch: Partial<PurchaseLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function toBaseUnits(product: LocalProduct, raw: number): number {
    return product.kind === "PIECE" ? Math.round(raw) : Math.round(raw * 1000);
  }

  function quantityUnit(product: LocalProduct | undefined): string {
    if (!product) return "qty";
    return product.kind === "PIECE" ? "pieces" : product.kind === "VOLUME" ? "L" : "kg";
  }

  const prepared = lines
    .map((line) => {
      const product = productById.get(line.productId);
      const qty = Number(line.qty);
      const lineCents = pesoInputToCents(line.lineTotal);
      if (
        !product ||
        !Number.isFinite(qty) ||
        qty <= 0 ||
        lineCents === null ||
        lineCents <= 0
      ) {
        return null;
      }
      return {
        productId: product.id,
        quantityBase: toBaseUnits(product, qty),
        lineTotalCents: lineCents,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const previewTotal = prepared.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const invalid = prepared.length === 0;

  async function submit() {
    setBusy(true);
    try {
      await createPurchase({
        supplierId: supplierId || null,
        note: note.trim() || undefined,
        items: prepared,
      });
      toast({
        title: "Purchase recorded",
        description: "Stock and cost were updated.",
        variant: "success",
      });
      await onSaved();
    } catch (err) {
      toast({
        title: "Could not record purchase",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Record purchase"
      subtitle="Adds the quantities to inventory and updates each cost basis."
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-3">
        <FloatingSelect
          label="Supplier (optional)"
          value={supplierId}
          onChange={setSupplierId}
        >
          <option value="">Walk-in / unknown</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </FloatingSelect>

        <div className="space-y-2">
          {lines.map((line) => {
            const product = productById.get(line.productId);
            return (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl border border-ink/10 p-3 sm:grid-cols-[1.6fr_0.8fr_0.9fr_auto]"
              >
                <FloatingSelect
                  label="Product"
                  value={line.productId}
                  onChange={(value) => updateLine(line.id, { productId: value })}
                >
                  <option value="">Select…</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </FloatingSelect>
                <FloatingInput
                  label={`Qty (${quantityUnit(product)})`}
                  value={line.qty}
                  onChange={(value) => updateLine(line.id, { qty: value })}
                  inputMode="decimal"
                />
                <FloatingInput
                  label="Line cost (₱)"
                  value={line.lineTotal}
                  onChange={(value) => updateLine(line.id, { lineTotal: value })}
                  inputMode="decimal"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="mb-1 grid h-9 w-9 place-items-center rounded-xl text-berry transition hover:bg-berry/10"
                  aria-label="Remove line"
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 px-3 py-1.5 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
          >
            <Plus className="h-3.5 w-3.5" /> Add product line
          </button>
        </div>

        <FloatingInput label="Note (optional)" value={note} onChange={setNote} />

        <div className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3">
          <span className="text-sm text-ink/60">Purchase total</span>
          <span className="text-lg font-bold tabular">{formatPHP(previewTotal)}</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy || invalid}
            onClick={() => void submit()}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Record purchase
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-ink/15 px-5 py-3.5 font-semibold transition hover:bg-ink/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
