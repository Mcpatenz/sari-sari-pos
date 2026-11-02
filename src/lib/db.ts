import Dexie, { type EntityTable } from "dexie";
import type { ProductKind, SellingUnit } from "./pricing";

export type SyncStatus = "SYNCED" | "PENDING" | "FAILED";

export type LocalProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  kind: ProductKind;
  basePriceCents: number;
  stockBaseUnits: number;
  costPerBaseCents: number;
  lowStockAt: number;
  units: SellingUnit[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocalSale = {
  id: string;
  receiptNumber: string;
  idempotencyKey: string;
  totalCents: number;
  discountCents: number;
  cashReceivedCents: number;
  changeCents: number;
  // How the customer paid. Older records have no value and are treated as CASH.
  paymentMethod?: "CASH" | "GCASH" | "UTANG";
  // GCash confirmation/reference number, captured for GCASH sales.
  referenceNumber?: string | null;
  status: "COMPLETED" | "VOIDED" | "RETURNED";
  syncStatus: SyncStatus;
  syncError?: string;
  // Id assigned by the server once the sale syncs. Needed to void/return it.
  serverId?: string | null;
  createdAt: string;
  syncedAt?: string | null;
  customerId?: string | null;
  cashierId?: string | null;
  // Name of the logged-in cashier at the time of sale, kept locally so the
  // receipt can print it without a connection (and for older reprints).
  cashierName?: string | null;
};

export type LocalSaleItem = {
  id: string;
  saleId: string;
  productId: string | null;
  sku: string;
  productName: string;
  kind: ProductKind;
  quantityBase: number;
  unitLabel: string | null;
  lineTotalCents: number;
};

export type LocalCustomer = {
  id: string;
  customerId: string;
  name: string;
  contactNumber: string | null;
  address: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MetaRecord = {
  key: string;
  value: string;
};

function readStoreCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)tindahan_store=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The offline database is namespaced per store so two stores sharing a browser
 * or device never collide. The server still authorizes every request — this is
 * only a local-cache boundary. The module import runs after login-time cookies
 * are set because sign-in triggers a full page load.
 */
function localDatabaseName(): string {
  return `SariSariStoreDB_${readStoreCookie() ?? "default"}`;
}

class StoreDatabase extends Dexie {
  products!: EntityTable<LocalProduct, "id">;
  sales!: EntityTable<LocalSale, "id">;
  saleItems!: EntityTable<LocalSaleItem, "id">;
  customers!: EntityTable<LocalCustomer, "id">;
  meta!: EntityTable<MetaRecord, "key">;

  constructor() {
    super(localDatabaseName());

    this.version(1).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
    });

    this.version(2).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
      sales: "id, receiptNumber, createdAt, status",
      saleItems: "id, saleId, productId",
    });

    this.version(3).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
      sales: "id, receiptNumber, createdAt, status, syncStatus, idempotencyKey",
      saleItems: "id, saleId, productId",
    });

    this.version(4).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
      sales: "id, receiptNumber, createdAt, status, syncStatus, idempotencyKey",
      saleItems: "id, saleId, productId",
      meta: "key",
    });

    this.version(5).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
      sales:
        "id, receiptNumber, createdAt, status, syncStatus, idempotencyKey, serverId",
      saleItems: "id, saleId, productId",
      meta: "key",
    });

    this.version(6).stores({
      products: "id, sku, name, category, kind, active, updatedAt",
      sales:
        "id, receiptNumber, createdAt, status, syncStatus, idempotencyKey, serverId, customerId",
      saleItems: "id, saleId, productId",
      meta: "key",
      customers: "id, customerId, name, active, createdAt",
    });
  }
}

export const db = new StoreDatabase();

export async function getMeta(key: string): Promise<string | null> {
  const record = await db.meta.get(key);
  return record?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

export async function getDeviceId(): Promise<string> {
  let id = await getMeta("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    await setMeta("deviceId", id);
  }
  return id;
}

export type StoreProfile = {
  name: string;
  address: string | null;
  phone: string | null;
  gcashQr: string | null;
};

/**
 * Store branding cached locally so receipts can be printed while offline.
 * Populated from /api/auth/me whenever the app has a connection.
 */
export async function getStoreProfile(): Promise<StoreProfile | null> {
  const name = await getMeta("storeName");
  if (!name) return null;
  return {
    name,
    address: (await getMeta("storeAddress")) || null,
    phone: (await getMeta("storePhone")) || null,
    gcashQr: (await getMeta("storeGcashQr")) || null,
  };
}

export async function setStoreProfile(profile: StoreProfile): Promise<void> {
  await setMeta("storeName", profile.name);
  await setMeta("storeAddress", profile.address ?? "");
  await setMeta("storePhone", profile.phone ?? "");
  await setMeta("storeGcashQr", profile.gcashQr ?? "");
}

/**
 * Wipe every cached record for the current store. Called on sign-out so the
 * next person using this browser/device starts from a clean offline database.
 */
export async function clearLocalData(): Promise<void> {
  await db.delete();
}

export { formatPHP, formatQuantity } from "./format";
export { priceForQuantity as calculatePrice } from "./pricing";
