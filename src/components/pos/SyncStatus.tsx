"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { syncPendingSales } from "@/lib/sales-sync";
import { refreshProductsFromServer } from "@/lib/products-api";
import { useToast } from "@/components/ui/Toast";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function SyncStatus() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  const pending =
    useLiveQuery(
      () => db.sales.where("syncStatus").anyOf("PENDING", "FAILED").count(),
      [],
    ) ?? 0;
  const failed =
    useLiveQuery(() => db.sales.where("syncStatus").equals("FAILED").count(), []) ??
    0;
  const lastSync = useLiveQuery(
    async () => (await db.meta.get("lastSyncAt"))?.value ?? null,
    [],
  );

  useEffect(() => {
    // Pull products and flush the queue when the POS opens, and again on reconnect.
    const run = async () => {
      try {
        await refreshProductsFromServer();
      } catch {
        // Offline: keep the local cache.
      }
      await syncPendingSales();
    };
    void run();
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function syncNow() {
    setBusy(true);
    try {
      try {
        await refreshProductsFromServer();
      } catch {
        // ignore pull errors
      }
      const result = await syncPendingSales();
      if (result.skipped) {
        toast({ title: "No connection", description: "Sales stay queued locally.", variant: "warning" });
      } else if (result.failed > 0) {
        toast({
          title: `${result.pushed} synced · ${result.failed} need review`,
          variant: "warning",
        });
      } else {
        toast({
          title: result.pushed > 0 ? `${result.pushed} sale(s) synced` : "Everything is in sync",
          variant: "success",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {failed > 0 && (
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 rounded-full bg-berry/10 px-3 py-1.5 text-xs font-semibold text-berry"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          {failed} failed
        </Link>
      )}

      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-ink/25"
        title={
          lastSync ? `Last sync ${new Date(lastSync).toLocaleString("en-PH")}` : "Not synced yet"
        }
      >
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-mango" />
            Offline · {pending} queued
          </>
        ) : busy ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-leaf" />
            Syncing…
          </>
        ) : pending > 0 ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mango opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mango" />
            </span>
            {pending} pending · Sync
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-leaf" />
            Synced
          </>
        )}
      </button>
    </div>
  );
}
