"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingBasket,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
  HandCoins,
} from "lucide-react";
import { SyncStatus } from "@/components/pos/SyncStatus";
import { clearLocalData, setMeta, setStoreProfile } from "@/lib/db";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/cashier", label: "Cashier", icon: Store },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/products", label: "Products", icon: Package, ownerOnly: true },
  { href: "/categories", label: "Categories", icon: Tags, ownerOnly: true },
  { href: "/suppliers", label: "Suppliers", icon: Truck, ownerOnly: true },
  { href: "/expenses", label: "Expenses", icon: Wallet, ownerOnly: true },
  { href: "/cashiers", label: "Users", icon: Users, ownerOnly: true },
  { href: "/customers", label: "Customers", icon: Users, ownerOnly: false },
  { href: "/utang", label: "Utang", icon: HandCoins, ownerOnly: false },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function AppBar({ navBelowLg = false }: { navBelowLg?: boolean }) {
  const pathname = usePathname();
  const [role, setRole] = useState<"OWNER" | "CASHIER" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (data: {
          user?: {
            name?: string | null;
            role?: "OWNER" | "CASHIER";
            storeName?: string | null;
            storeAddress?: string | null;
            storePhone?: string | null;
            storeGcashQr?: string | null;
          };
        }) => {
          if (!active) return;
          if (data.user?.role) setRole(data.user.role);
          // Keep an offline copy of the signed-in name so receipts can show
          // who rang up the sale even when the device is offline.
          if (data.user?.name) void setMeta("userName", data.user.name);
          // Keep an offline copy so receipts keep the store's branding even
          // when the device is offline.
          if (data.user?.storeName) {
            void setStoreProfile({
              name: data.user.storeName,
              address: data.user.storeAddress ?? null,
              phone: data.user.storePhone ?? null,
              gcashQr: data.user.storeGcashQr ?? null,
            });
          }
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const items = NAV.filter((item) => !item.ownerOnly || role === "OWNER");

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Wipe this store's offline cache so the next sign-in starts clean.
      await clearLocalData();
    } catch {
      // Local wipe is best-effort; the session cookie is still cleared.
    } finally {
      // Full page load re-reads the (now cleared) store cookie and renamespaces
      // the offline database for the next account.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-mango">
              <ShoppingBasket className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-bold sm:block">TindahanPOS</span>
          </Link>

          <nav
            className={`flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-ink/10 bg-white/60 p-1 ${
              navBelowLg ? "lg:hidden" : ""
            }`}
          >
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-ink text-cream" : "text-ink/65 hover:text-ink"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <SyncStatus />
          <Link
            href="/"
            className="btn btn-secondary btn-icon btn-sm text-ink/60 hover:text-ink"
            aria-label="Back to home"
          >
            <Home className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            aria-label="Log out"
            title="Log out"
            className="btn btn-secondary btn-icon btn-sm text-ink/60 hover:text-berry"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
