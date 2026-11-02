import { db } from "@/lib/db";
import type { LocalProduct } from "@/lib/db";
import type { ProductKind, SellingUnit } from "@/lib/pricing";

type ApiProduct = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  kind: ProductKind;
  basePriceCents: number;
  stockBaseUnits: number;
  costPerBaseCents?: number;
  lowStockAt?: number;
  units?: unknown;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function normalizeUnits(value: unknown): SellingUnit[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (unit): unit is Record<string, unknown> =>
        typeof unit === "object" && unit !== null,
    )
    .map((unit, index) => ({
      id: typeof unit.id === "string" ? unit.id : `unit-${index}`,
      label: typeof unit.label === "string" ? unit.label : "Preset",
      quantityBase: Number(unit.quantityBase) || 0,
      priceCents:
        unit.priceCents === null || unit.priceCents === undefined
          ? null
          : Number(unit.priceCents),
    }))
    .filter((unit) => unit.quantityBase > 0);
}

export function normalizeProduct(product: ApiProduct): LocalProduct {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? null,
    name: product.name,
    category: product.category ?? "General",
    kind: product.kind,
    basePriceCents: product.basePriceCents,
    stockBaseUnits: product.stockBaseUnits,
    costPerBaseCents: product.costPerBaseCents ?? 0,
    lowStockAt: product.lowStockAt ?? 0,
    units: normalizeUnits(product.units),
    active: product.active,
    createdAt: new Date(product.createdAt).toISOString(),
    updatedAt: new Date(product.updatedAt).toISOString(),
  };
}

export async function refreshProductsFromServer(): Promise<LocalProduct[]> {
  const response = await fetch("/api/products", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load products from the server.");
  }

  const data = (await response.json()) as { products?: ApiProduct[] };
  if (!Array.isArray(data.products)) {
    throw new Error("The products API returned an invalid response.");
  }

  const products = data.products.map(normalizeProduct);
  const serverIds = new Set(products.map((product) => product.id));

  await db.transaction("rw", db.products, async () => {
    for (const product of products) {
      // Drop older local records that share a SKU but not the server id.
      const matches = await db.products.where("sku").equals(product.sku).toArray();
      for (const match of matches) {
        if (match.id !== product.id) await db.products.delete(match.id);
      }
      await db.products.put(product);
    }

    // Remove cached products that no longer exist on the server.
    const locals = await db.products.toArray();
    for (const local of locals) {
      if (!serverIds.has(local.id)) await db.products.delete(local.id);
    }
  });

  return products;
}

export type NewProductInput = Omit<
  LocalProduct,
  "id" | "createdAt" | "updatedAt"
>;

export async function createCentralProduct(
  product: NewProductInput,
): Promise<LocalProduct> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  const data = (await response.json().catch(() => ({}))) as {
    product?: ApiProduct;
    error?: string;
  };

  if (!response.ok || !data.product) {
    throw new Error(data.error || "Could not save the product.");
  }

  const saved = normalizeProduct(data.product);
  await db.products.put(saved);
  return saved;
}

export async function archiveCentralProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  const data = (await response.json().catch(() => ({}))) as {
    product?: ApiProduct;
    error?: string;
  };

  if (!response.ok || !data.product) {
    throw new Error(data.error || "Could not archive the product.");
  }

  await db.products.put(normalizeProduct(data.product));
}

export async function adjustCentralStock(input: {
  productId: string;
  quantityBase: number;
  note?: string;
}): Promise<LocalProduct> {
  const response = await fetch("/api/products/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => ({}))) as {
    product?: ApiProduct;
    error?: string;
  };

  if (!response.ok || !data.product) {
    throw new Error(data.error || "Could not adjust the stock.");
  }

  const saved = normalizeProduct(data.product);
  await db.products.put(saved);
  return saved;
}

export async function updateCentralProduct(
  id: string,
  product: NewProductInput,
): Promise<LocalProduct> {
  const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  const data = (await response.json().catch(() => ({}))) as {
    product?: ApiProduct;
    error?: string;
  };

  if (!response.ok || !data.product) {
    throw new Error(data.error || "Could not update the product.");
  }

  const saved = normalizeProduct(data.product);
  await db.products.put(saved);
  return saved;
}
