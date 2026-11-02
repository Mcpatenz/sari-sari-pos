"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  HandCoins,
  LayoutDashboard,
  Loader2,
  Package,
  Receipt,
  Settings,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { NavModal } from "@/components/pos/NavModal";

function ViewLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink/50">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

// Each manage view is lazy-loaded only when the owner opens it, so the
// dashboard stays light. They are hosted inside a popup rather than navigated
// to as separate pages.
const CashierView = dynamic(
  () => import("@/app/cashier/page").then((mod) => mod.CashierView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const SalesView = dynamic(
  () => import("@/app/sales/page").then((mod) => mod.SalesView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const ProductsView = dynamic(
  () => import("@/app/products/page").then((mod) => mod.ProductsView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const CategoriesView = dynamic(
  () => import("@/app/categories/page").then((mod) => mod.CategoriesView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const SuppliersView = dynamic(
  () => import("@/app/suppliers/page").then((mod) => mod.SuppliersView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const ExpensesView = dynamic(
  () => import("@/app/expenses/page").then((mod) => mod.ExpensesView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const CustomersView = dynamic(
  () => import("@/app/customers/page").then((mod) => mod.CustomersView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const UtangView = dynamic(
  () => import("@/app/utang/page").then((mod) => mod.UtangView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const CashiersView = dynamic(
  () => import("@/app/cashiers/page").then((mod) => mod.CashiersView),
  { ssr: false, loading: () => <ViewLoading /> },
);
const SettingsView = dynamic(
  () => import("@/app/settings/page").then((mod) => mod.SettingsView),
  { ssr: false, loading: () => <ViewLoading /> },
);

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  view: ComponentType;
};

/** Owner navigation, shown as a persistent sidebar on the dashboard. */
export const OWNER_NAV: NavItem[] = [
  { href: "/cashier", label: "Cashier", icon: Store, view: CashierView },
  { href: "/sales", label: "Sales", icon: Receipt, view: SalesView },
  { href: "/products", label: "Products", icon: Package, view: ProductsView },
  { href: "/categories", label: "Categories", icon: Tags, view: CategoriesView },
  { href: "/suppliers", label: "Suppliers", icon: Truck, view: SuppliersView },
  { href: "/expenses", label: "Expenses", icon: Wallet, view: ExpensesView },
  { href: "/customers", label: "Customers", icon: Users, view: CustomersView },
  { href: "/utang", label: "Utang list", icon: HandCoins, view: UtangView },
  { href: "/cashiers", label: "Users", icon: UserRound, view: CashiersView },
  { href: "/settings", label: "Settings", icon: Settings, view: SettingsView },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<NavItem | null>(null);

  return (
    <>
      <aside className="hidden w-60 shrink-0 lg:block">
        <nav className="sticky top-24 flex flex-col gap-1 rounded-3xl border border-ink/10 bg-white/70 p-3">
          <Link
            href="/dashboard"
            className={`mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
              pathname === "/dashboard"
                ? "bg-ink text-cream"
                : "text-ink/65 hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-mango">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            Dashboard
          </Link>

          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ink/40">
            Manage
          </p>

          {OWNER_NAV.map((item) => {
            const active = open?.href === item.href;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setOpen(item)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "bg-ink text-cream"
                    : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    active ? "bg-cream/15 text-mango" : "bg-ink/5 text-ink/60"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {open && <OwnerNavModal item={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function OwnerNavModal({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const ActiveView = item.view;
  return (
    <NavModal title={item.label} onClose={onClose}>
      <ActiveView />
    </NavModal>
  );
}
