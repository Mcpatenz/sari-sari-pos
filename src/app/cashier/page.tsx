"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BadgeCheck,
  Banknote,
  ChevronRight,
  Mail,
  Minus,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Search,
  ScanLine,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { ProfileModal } from "@/components/pos/ProfileModal";
import { SellSheet, type SellSelection } from "@/components/pos/SellSheet";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { useToast } from "@/components/ui/Toast";
import { FloatingInput } from "@/components/ui/FloatingField";
import { initials } from "@/components/ui/AvatarPicker";
import { db, getMeta } from "@/lib/db";
import type { LocalProduct, LocalSale, LocalSaleItem } from "@/lib/db";
import { fetchProfile, type ApiProfile } from "@/lib/profile-api";
import { priceForQuantity } from "@/lib/pricing";
import { formatPHP, formatQuantity } from "@/lib/format";
import { syncPendingSales } from "@/lib/sales-sync";

type CartLine = {
  productId: string;
  quantityBase: number;
  unitLabel: string | null;
};

type Receipt = { sale: LocalSale; items: LocalSaleItem[] };

type Customer = {
  id: string;
  customerId: string;
  name: string;
  contactNumber: string | null;
  address?: string | null;
  photoUrl?: string | null;
};

const CASH_OPTIONS = [20, 50, 100, 200, 500, 1000];

function pesoToCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return NaN;
  const [pesos, fraction = ""] = value.trim().split(".");
  return Number(pesos) * 100 + Number((fraction + "00").slice(0, 2));
}

export function CashierView() {
  const { toast } = useToast();
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), [], []) as LocalProduct[];

  const gcashQr = useLiveQuery(
    () => db.meta.get("storeGcashQr").then((record) => record?.value || null),
    [],
    null,
  ) as string | null;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "UTANG">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [gcashReference, setGcashReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<LocalProduct | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProfile();
        if (active) setProfile(data);
      } catch {
        // The card is a convenience; ignore failures (e.g. offline).
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) if (product.active) set.add(product.category);
    return ["All", ...[...set].sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        product.active &&
        (category === "All" || product.category === category) &&
        (!term ||
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          (product.barcode ?? "").toLowerCase().includes(term)),
    );
  }, [products, search, category]);

  const cartDetails = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) return [];
        return [
          {
            ...line,
            product,
            lineTotalCents: priceForQuantity(product, line.quantityBase),
          },
        ];
      }),
    [cart, products],
  );

  const totalCents = cartDetails.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const isGcash = paymentMethod === "GCASH";
  const isUtang = paymentMethod === "UTANG";
  const isCash = paymentMethod === "CASH";
  // A GCash sale is settled in full by the transfer, so there is no change.
  // Utang is charged to the customer's tab, so no cash is collected up front.
  const receivedCents = isGcash ? totalCents : isUtang ? 0 : pesoToCents(cashReceived);
  const cashEntered = Number.isSafeInteger(receivedCents);
  // Negative when the cash on hand is short of the total.
  const changeCents = cashEntered ? receivedCents - totalCents : 0;
  const cashShort = isCash && cashEntered && changeCents < 0;
  const gcashReferenceOk = !isGcash || gcashReference.trim().length >= 4;
  // Cash needs an amount that covers the total, GCash needs the transfer's
  // reference number, and Utang needs the customer whose tab it goes on.
  const canComplete =
    cartDetails.length > 0 &&
    (isGcash
      ? gcashReferenceOk
      : isUtang
        ? Boolean(selectedCustomer)
        : Boolean(cashEntered && !cashShort));

  useEffect(() => {
    if (!isUtang) return;
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (customerSearch) params.set("search", customerSearch);
        params.set("limit", "10");
        const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active) setCustomers(data.customers || []);
        }
      } catch {
        // Offline or a hiccup: keep whatever list we already have.
      }
    })();
    return () => {
      active = false;
    };
  }, [isUtang, customerSearch]);

  // A fresh search clears the pick so a stale customer can't be billed.
  function clearCustomerSearch(value: string) {
    setCustomerSearch(value);
    setSelectedCustomer(null);
  }

  function cartQuantity(productId: string): number {
    return cart
      .filter((line) => line.productId === productId)
      .reduce((sum, line) => sum + line.quantityBase, 0);
  }

  function addSelection(product: LocalProduct, selection: SellSelection) {
    const already = cartQuantity(product.id);
    if (already + selection.quantityBase > product.stockBaseUnits) {
      toast({
        title: "Not enough stock",
        description: `Only ${formatQuantity(product.kind, product.stockBaseUnits)} of ${product.name}.`,
        variant: "error",
      });
      return;
    }

    setReceipt(null);
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (!existing) {
        return [
          ...current,
          {
            productId: product.id,
            quantityBase: selection.quantityBase,
            unitLabel: selection.unitLabel,
          },
        ];
      }
      return current.map((line) =>
        line.productId === product.id
          ? {
              ...line,
              quantityBase: line.quantityBase + selection.quantityBase,
              unitLabel: null,
            }
          : line,
      );
    });

    toast({
      title: `${product.name} added`,
      description: `${selection.unitLabel ?? formatQuantity(product.kind, selection.quantityBase)} · ${formatPHP(
        priceForQuantity(product, selection.quantityBase),
      )}`,
      variant: "success",
      duration: 2200,
    });
  }

  function handleScan(rawCode: string) {
    setScannerOpen(false);
    const code = rawCode.trim();
    const needle = code.toLowerCase();
    const product = products.find(
      (item) =>
        item.active &&
        ((item.barcode ?? "").trim().toLowerCase() === needle ||
          item.sku.trim().toLowerCase() === needle),
    );

    if (!product) {
      setSearch(code);
      toast({
        title: "Barcode not found",
        description: `No product matches ${code}.`,
        variant: "warning",
      });
      return;
    }

    if (product.stockBaseUnits <= 0) {
      toast({
        title: `${product.name} is out of stock`,
        description: "Restock it before selling.",
        variant: "error",
      });
      return;
    }

    // A piece product can be added straight from the scan. Measured products
    // need the sheet so the cashier can choose a weight or tingi preset.
    if (product.kind === "PIECE") {
      addSelection(product, { quantityBase: 1, unitLabel: null });
    } else {
      setSheetProduct(product);
    }
  }

  function adjustLine(productId: string, delta: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.productId !== productId) return [line];
        const next = line.quantityBase + delta;
        if (next <= 0) return [];
        const product = products.find((item) => item.id === productId);
        if (product && next > product.stockBaseUnits) return [line];
        return [{ ...line, quantityBase: next, unitLabel: null }];
      }),
    );
  }

  async function checkout() {
    if (cartDetails.length === 0) {
      toast({ title: "Your cart is empty.", variant: "warning" });
      return;
    }
    if (isGcash && !gcashQr) {
      toast({
        title: "No GCash QR set",
        description: "Ask the owner to upload one in Settings.",
        variant: "warning",
      });
      return;
    }
    if (isGcash && gcashReference.trim().length < 4) {
      toast({
        title: "GCash reference needed",
        description: "Enter the GCash confirmation/reference number.",
        variant: "warning",
      });
      return;
    }
    if (isCash && (!Number.isSafeInteger(receivedCents) || receivedCents < totalCents)) {
      toast({
        title: "Cash is short",
        description: "Enter an amount equal to or greater than the total.",
        variant: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      // Stamp the sale with whoever is logged in so the receipt can print it.
      // The profile fetch fails offline, so fall back to the name cached by
      // the app bar at sign-in. Read before the transaction (it touches db.meta).
      const cashierName =
        profile?.name ?? (await getMeta("userName").catch(() => null));

      const result = await db.transaction(
        "rw",
        db.products,
        db.sales,
        db.saleItems,
        async () => {
          const now = new Date();
          const saleId = crypto.randomUUID();
          const savedItems: LocalSaleItem[] = [];
          let total = 0;

          for (const line of cart) {
            const product = await db.products.get(line.productId);
            if (!product || !product.active) {
              throw new Error("A product is no longer available.");
            }
            if (product.stockBaseUnits < line.quantityBase) {
              throw new Error(
                `Not enough stock for ${product.name}. Available: ${formatQuantity(
                  product.kind,
                  product.stockBaseUnits,
                )}.`,
              );
            }

            const lineTotal = priceForQuantity(product, line.quantityBase);
            total += lineTotal;

            savedItems.push({
              id: crypto.randomUUID(),
              saleId,
              productId: product.id,
              sku: product.sku,
              productName: product.name,
              kind: product.kind,
              quantityBase: line.quantityBase,
              unitLabel: line.unitLabel,
              lineTotalCents: lineTotal,
            });

            await db.products.update(product.id, {
              stockBaseUnits: product.stockBaseUnits - line.quantityBase,
              updatedAt: now.toISOString(),
            });
          }

          if (isCash && receivedCents < total) {
            throw new Error("Cash received is less than the sale total.");
          }

          const sale: LocalSale = {
            id: saleId,
            receiptNumber: `SS-${now.getTime().toString(36).toUpperCase()}`,
            idempotencyKey: crypto.randomUUID(),
            totalCents: total,
            discountCents: 0,
            cashReceivedCents: isUtang ? 0 : receivedCents,
            changeCents: isUtang ? 0 : (receivedCents - total),
            paymentMethod: isGcash ? "GCASH" : isUtang ? "UTANG" : "CASH",
            referenceNumber: isGcash ? gcashReference.trim() : undefined,
            customerId: isUtang && selectedCustomer ? selectedCustomer.id : undefined,
            cashierId: profile?.id ?? null,
            cashierName,
            status: "COMPLETED",
            syncStatus: "PENDING",
            createdAt: now.toISOString(),
          };

          await db.sales.add(sale);
          await db.saleItems.bulkAdd(savedItems);

          return { sale, items: savedItems };
        },
      );

      setReceipt(result);
      setCart([]);
      setCashReceived("");
      setGcashReference("");
      if (isUtang) {
        setSelectedCustomer(null);
        setCustomerSearch("");
      }
      toast({
        title: "Sale completed",
        description: `${formatPHP(result.sale.totalCents)} · change ${formatPHP(
          result.sale.changeCents,
        )}`,
        variant: "success",
      });

      const sync = await syncPendingSales();
      if (sync.pushed > 0) {
        toast({ title: "Synced to the server", variant: "success", duration: 2000 });
      } else if (sync.failed > 0) {
        toast({ title: "Saved offline · pending sync", variant: "warning" });
      }
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cashier</h1>
            <p className="text-sm text-ink/55">
              Tap a product, choose tingi, custom or open price.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm">
            <ShoppingCart className="h-4 w-4 text-leaf" />
            <span className="font-semibold">{cartDetails.length}</span> line(s)
          </div>
        </div>

        <section className="card mb-5 flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink/10 bg-ink/5 text-xl font-bold text-ink/50">
            {profile?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(profile?.name ?? "")
            )}
          </div>
          <div className="min-w-[12rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold tracking-tight">
                {profile?.name ?? "—"}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold uppercase text-ink/60">
                {profile?.role === "OWNER" ? "Owner" : "Cashier"}
              </span>
              {profile?.employeeId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-[11px] font-bold text-leaf">
                  <BadgeCheck className="h-3 w-3" /> {profile.employeeId}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
              {profile?.contactNumber && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {profile.contactNumber}
                </span>
              )}
              {profile?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {profile.email}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!profile}
            onClick={() => setShowProfile(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold transition hover:border-leaf hover:text-leaf disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </button>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, SKU or barcode…"
                    className="w-full rounded-2xl border border-ink/12 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="btn btn-secondary shrink-0"
                  title="Scan barcode or QR code"
                  aria-label="Scan barcode or QR code"
                >
                  <ScanLine className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
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

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleProducts.map((product) => {
                const out = product.stockBaseUnits <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={out}
                    onClick={() => setSheetProduct(product)}
                    className="group relative rounded-2xl border border-ink/10 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-lg hover:shadow-leaf/10 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-tight">
                        {product.name}
                      </span>
                      {product.units.length > 0 && (
                        <span className="rounded-full bg-mango/20 px-2 py-0.5 text-[10px] font-bold uppercase text-mango">
                          Tingi
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] text-ink/45">
                      {product.sku} · {product.category}
                    </span>
                    <span className="mt-2 block text-base font-bold text-leaf">
                      {formatPHP(product.basePriceCents)}
                      <span className="text-xs font-medium text-ink/45">
                        {product.kind === "PIECE"
                          ? " / pc"
                          : product.kind === "VOLUME"
                            ? " / L"
                            : " / kg"}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] text-ink/50">
                      {formatQuantity(product.kind, product.stockBaseUnits)} left
                    </span>
                    {product.lowStockAt > 0 &&
                      product.stockBaseUnits <= product.lowStockAt && (
                        <span className="mt-1 inline-block rounded-full bg-berry/10 px-2 py-0.5 text-[10px] font-bold text-berry">
                          Low stock
                        </span>
                      )}
                  </button>
                );
              })}

              {visibleProducts.length === 0 && (
                <p className="col-span-full rounded-2xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/50">
                  No products yet. Add them on the{" "}
                  <a href="/products" className="font-semibold text-leaf">
                    Products
                  </a>{" "}
                  page.
                </p>
              )}
            </div>
          </section>

          <section className="card flex flex-col p-4 sm:p-5">
            <h2 className="text-lg font-bold">Current sale</h2>

            <div className="mt-4 flex-1 space-y-3">
              {cartDetails.length === 0 && (
                <p className="rounded-2xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/50">
                  Select a product to start.
                </p>
              )}

              {cartDetails.map((line) => (
                <div key={line.productId} className="rounded-2xl border border-ink/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{line.product.name}</p>
                      <p className="text-xs text-ink/55">
                        {formatQuantity(line.product.kind, line.quantityBase)}
                        {line.unitLabel ? ` · ${line.unitLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustLine(line.productId, -1)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-ink/10 text-ink/60 transition hover:bg-ink/5"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustLine(line.productId, 1)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-ink/10 text-ink/60 transition hover:bg-ink/5"
                        aria-label="Increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((current) =>
                            current.filter((item) => item.productId !== line.productId),
                          )
                        }
                        className="grid h-7 w-7 place-items-center rounded-lg text-berry transition hover:bg-berry/10"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setSheetProduct(line.product)}
                      className="text-xs font-semibold text-leaf"
                    >
                      + Add more
                    </button>
                    <span className="font-bold tabular">
                      {formatPHP(line.lineTotalCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-ink/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-ink/60">Total</span>
                <span className="text-2xl font-bold tabular">
                  {formatPHP(totalCents)}
                </span>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
                  Mode of payment
                </p>
                <div className="flex rounded-2xl border border-ink/12 p-1">
                  {(["CASH", "GCASH", "UTANG"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
                        paymentMethod === method ? "bg-ink text-cream" : "text-ink/60"
                      }`}
                    >
                      {method === "CASH" ? (
                        <Banknote className="h-4 w-4" />
                      ) : method === "GCASH" ? (
                        <QrCode className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      {method === "CASH" ? "Cash" : method === "GCASH" ? "GCash" : "Utang"}
                    </button>
                  ))}
                </div>
              </div>

              {isGcash ? (
                <div className="mt-4 rounded-2xl border border-ink/10 p-4 text-center">
                  {gcashQr ? (
                    <>
                      <p className="text-sm font-semibold">Scan to pay with GCash</p>
                      <p className="text-xs text-ink/50">
                        Ask the customer to scan this QR, then confirm the payment.
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gcashQr}
                        alt="GCash payment QR code"
                        className="mx-auto mt-3 h-56 w-56 rounded-xl border border-ink/10 bg-white object-contain p-2"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-ink/60">
                      No GCash QR set yet. The owner can upload one in{" "}
                      <a href="/settings" className="font-semibold text-leaf">
                        Settings
                      </a>
                      .
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3">
                    <span className="text-sm text-ink/60">Amount due</span>
                    <span className="text-lg font-bold text-leaf tabular">{formatPHP(totalCents)}</span>
                  </div>
                  <div className="mt-3 text-left">
                    <FloatingInput
                      label="GCash reference no."
                      value={gcashReference}
                      onChange={setGcashReference}
                    />
                    <p className="mt-1 text-xs text-ink/50">
                      Enter the reference/confirmation number from the customer&apos;s
                      GCash receipt.
                    </p>
                  </div>
                </div>
              ) : isUtang ? (
                <div className="mt-4 rounded-2xl border border-ink/10 p-4">
                  <p className="text-sm font-semibold">Utang (Credit)</p>
                  <p className="text-xs text-ink/50">
                    Search and select the customer for this transaction.
                  </p>

                  {selectedCustomer ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-ink/5 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {selectedCustomer.name}
                        </p>
                        <p className="truncate text-xs text-ink/50">
                          ID: {selectedCustomer.customerId}
                          {selectedCustomer.contactNumber
                            ? ` · ${selectedCustomer.contactNumber}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="shrink-0 rounded-xl border border-ink/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-ink/5"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                          <input
                            value={customerSearch}
                            onChange={(event) => clearCustomerSearch(event.target.value)}
                            placeholder="Search name, ID or contact"
                            aria-label="Search customer"
                            className="w-full rounded-xl border border-ink/10 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-ink/30"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddCustomer(true)}
                          className="btn btn-primary btn-xs shrink-0"
                        >
                          Add customer
                        </button>
                      </div>

                      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-ink/10">
                        {customers.length === 0 ? (
                          <p className="px-3 py-3 text-center text-xs text-ink/50">
                            No customers found. Use <strong>Add customer</strong> to create
                            one.
                          </p>
                        ) : (
                          <ul className="divide-y divide-ink/5">
                            {customers.map((customer) => (
                              <li key={customer.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(customer)}
                                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-ink/5"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                      {customer.name}
                                    </span>
                                    <span className="block truncate text-xs text-ink/50">
                                      {customer.customerId}
                                      {customer.contactNumber
                                        ? ` · ${customer.contactNumber}`
                                        : ""}
                                    </span>
                                  </span>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/40" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3">
                    <span className="text-sm text-ink/60">Amount due</span>
                    <span className="text-lg font-bold text-leaf tabular">{formatPHP(totalCents)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4">
                    <FloatingInput
                      label="Cash received (₱)"
                      value={cashReceived}
                      onChange={setCashReceived}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCashReceived((totalCents / 100).toFixed(2))}
                      className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-ink/30"
                    >
                      Exact
                    </button>
                    {CASH_OPTIONS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCashReceived(amount.toFixed(2))}
                        className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-ink/30"
                      >
                        ₱{amount}
                      </button>
                    ))}
                  </div>

                  <div
                    className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3 ${
                      cashShort ? "bg-berry/10" : "bg-ink/5"
                    }`}
                  >
                    <span
                      className={`text-sm ${cashShort ? "font-semibold text-berry" : "text-ink/60"}`}
                    >
                      {cashShort ? "Short" : "Change"}
                    </span>
                    <span
                      className={`text-lg font-bold tabular ${
                        cashShort ? "text-berry" : "text-leaf"
                      }`}
                    >
                      {formatPHP(changeCents)}
                    </span>
                  </div>
                </>
              )}

              <button
                type="button"
                disabled={busy || !canComplete}
                onClick={() => void checkout()}
                className="btn btn-primary btn-lg mt-4 w-full"
              >
                {busy
                  ? "Processing…"
                  : isGcash
                    ? `Confirm GCash · ${formatPHP(totalCents)}`
                    : isUtang
                      ? `Record Utang · ${formatPHP(totalCents)}`
                      : `Complete sale · ${formatPHP(totalCents)}`}
              </button>
            </div>
          </section>
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {sheetProduct && (
        <SellSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
          onAdd={(selection) => addSelection(sheetProduct, selection)}
        />
      )}

      {receipt && (
        <ReceiptModal
          sale={receipt.sale}
          items={receipt.items}
          onClose={() => setReceipt(null)}
        />
      )}

      {showProfile && profile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={(updated) => {
            setProfile(updated);
            setShowProfile(false);
          }}
        />
      )}

      {showAddCustomer && (
        <CustomerFormModal
          onClose={() => setShowAddCustomer(false)}
          onSaved={(customer) => {
            setSelectedCustomer(customer);
            setCustomerSearch("");
            setCustomers((current) => [
              customer,
              ...current.filter((item) => item.id !== customer.id),
            ]);
            setShowAddCustomer(false);
          }}
        />
      )}
    </>
  );
}

export default function CashierPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <CashierView />
    </div>
  );
}

