"use client";

import { useState } from "react";
import { ArrowRight, Package, Receipt, ShoppingCart } from "lucide-react";
import { OWNER_NAV } from "@/components/pos/OwnerSidebar";
import { NavModal } from "@/components/pos/NavModal";

const QUICK_ACTIONS = [
  {
    href: "/products",
    title: "Manage products",
    description: "Add, edit and restock items in your store.",
    icon: Package,
  },
  {
    href: "/cashier",
    title: "Open the till",
    description: "Sell by tingi, bundle, weight or open price.",
    icon: ShoppingCart,
  },
  {
    href: "/sales",
    title: "Sales history",
    description: "Review receipts and synced transactions.",
    icon: Receipt,
  },
];

/**
 * Dashboard quick actions. Each card opens its page's view inside a popup
 * (the same hosting the sidebar uses) so the owner never leaves the dashboard.
 */
export function QuickActions() {
  const [open, setOpen] = useState<(typeof QUICK_ACTIONS)[number] | null>(null);
  const navItem = open ? OWNER_NAV.find((item) => item.href === open.href) : null;
  const ActiveView = navItem?.view;

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.href}
            type="button"
            onClick={() => setOpen(action)}
            className="group card card-interactive flex flex-col gap-3 p-6 text-left"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-mango">
              <action.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-semibold">{action.title}</p>
              <p className="mt-1 text-sm text-ink/55">{action.description}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-ink/70 transition group-hover:text-ink">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      {open && ActiveView && (
        <NavModal title={open.title} subtitle={open.description} onClose={() => setOpen(null)}>
          <ActiveView />
        </NavModal>
      )}
    </>
  );
}
