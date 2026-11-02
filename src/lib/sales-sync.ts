import { db, getDeviceId, setMeta } from "@/lib/db";
import { refreshProductsFromServer } from "@/lib/products-api";
import { pushSale, SaleSyncError } from "@/lib/sales-api";

export type SyncResult = {
  pushed: number;
  failed: number;
  skipped: boolean;
};

let syncing = false;
const listeners = new Set<() => void>();

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function isSyncing(): boolean {
  return syncing;
}

/**
 * Push every locally queued ("PENDING") sale to the central server, then pull
 * the latest product list so stock stays consistent across devices.
 *
 * - Transient failures (network / 5xx / re-auth needed) keep the sale PENDING.
 * - Business conflicts (other 4xx) mark the sale FAILED so the owner can review it.
 */
export async function syncPendingSales(): Promise<SyncResult> {
  if (syncing) return { pushed: 0, failed: 0, skipped: true };

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { pushed: 0, failed: 0, skipped: true };
  }

  syncing = true;
  emit();

  let pushed = 0;
  let failed = 0;

  try {
    const deviceId = await getDeviceId();
    const pending = await db.sales
      .where("syncStatus")
      .equals("PENDING")
      .toArray();

    for (const sale of pending) {
      const items = await db.saleItems
        .where("saleId")
        .equals(sale.id)
        .toArray();

      // The server needs a concrete product id to recompute line prices. A sale
      // that references a deleted product cannot be replayed safely, so surface
      // it for the owner instead of dropping a line (which would undercharge).
      if (items.length === 0 || items.some((item) => !item.productId)) {
        await db.sales.update(sale.id, {
          syncStatus: "FAILED",
          syncError: "A product in this sale was removed; review it manually.",
        });
        failed += 1;
        continue;
      }

      try {
        const serverSale = await pushSale({
          idempotencyKey: sale.idempotencyKey,
          deviceId,
          cashReceivedCents: sale.cashReceivedCents,
          discountCents: sale.discountCents,
          paymentMethod: sale.paymentMethod ?? "CASH",
          customerId: sale.customerId ?? undefined,
          referenceNumber: sale.referenceNumber ?? undefined,
          items: items.map((item) => ({
            productId: item.productId as string,
            quantityBase: item.quantityBase,
          })),
        });

        await db.sales.update(sale.id, {
          syncStatus: "SYNCED",
          syncedAt: new Date().toISOString(),
          syncError: undefined,
          serverId: serverSale.id,
        });
        pushed += 1;
      } catch (error) {
        // 401 means the session expired: keep PENDING so it retries after login.
        const needsAuth = error instanceof SaleSyncError && error.status === 401;
        const terminal =
          error instanceof SaleSyncError &&
          error.status >= 400 &&
          error.status < 500 &&
          !needsAuth;

        await db.sales.update(sale.id, {
          syncStatus: terminal ? "FAILED" : "PENDING",
          syncError: error instanceof Error ? error.message : "Sync failed",
        });
        failed += 1;
      }
    }

    try {
      await refreshProductsFromServer();
    } catch {
      // Pulling is best-effort; a failed pull should not fail the push.
    }

    await setMeta("lastSyncAt", new Date().toISOString());
    return { pushed, failed, skipped: false };
  } finally {
    syncing = false;
    emit();
  }
}
