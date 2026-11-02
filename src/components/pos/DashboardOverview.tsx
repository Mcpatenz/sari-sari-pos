"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CreditCard,
  HandCoins,
  HeartHandshake,
  ReceiptText,
  ShoppingCart,
  Tags,
  Wallet,
} from "lucide-react";
import { OWNER_NAV } from "@/components/pos/OwnerSidebar";
import { NavModal } from "@/components/pos/NavModal";
import { formatPHP } from "@/lib/format";
import type { DashboardStats } from "@/lib/stats";

const features = [
  { label: "Point of sale", description: "Sell by tingi, bundle, weight or open price.", icon: ShoppingCart, href: "/cashier", tone: "bg-leaf/10 text-leaf" },
  { label: "Order management", description: "Keep every receipt, status and return in one place.", icon: ReceiptText, href: "/sales", tone: "bg-mango/15 text-[#b46a00]" },
  { label: "Inventory control", description: "Know what is moving and what needs restocking.", icon: Boxes, href: "/products", tone: "bg-sky-100 text-sky-700" },
  { label: "Categories", description: "Group products and keep the till menu tidy.", icon: Tags, href: "/categories", tone: "bg-amber-100 text-amber-700" },
  { label: "Customers & loyalty", description: "Build repeat business with profiles and rewards.", icon: HeartHandshake, href: "/customers", tone: "bg-berry/10 text-berry" },
  { label: "Utang monitoring", description: "Track balances, due dates and customer payments.", icon: HandCoins, href: "/utang", tone: "bg-violet-100 text-violet-700" },
  { label: "Finance & expenses", description: "See cash flow, expenses and profit in context.", icon: Wallet, href: "/expenses", tone: "bg-cyan-100 text-cyan-700" },
];

export function DashboardOverview({ stats, name, storeName }: { stats: DashboardStats; name: string; storeName: string }) {
  const [openHref, setOpenHref] = useState<string | null>(null);
  const openItem = OWNER_NAV.find((item) => item.href === openHref);
  const ActiveView = openItem?.view;

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] bg-ink p-6 text-cream shadow-xl shadow-ink/10 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-leaf-soft">
              <span className="h-2 w-2 rounded-full bg-leaf" /> Live from your store
            </div>
            <p className="text-sm text-cream/55">Good day, {name}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Run your store with confidence.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-cream/65">Everything you need to sell faster, keep stock healthy, and turn everyday transactions into better decisions.</p>
          </div>
          <button type="button" onClick={() => setOpenHref("/cashier")} className="btn btn-gold">
            <ShoppingCart className="h-4 w-4" /> Open cashier <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-cream/45">Today&apos;s sales</p><p className="mt-1 text-2xl font-bold tabular">{formatPHP(stats.todaySalesCents)}</p><p className="text-xs text-cream/45">{stats.todaySalesCount} completed receipts</p></div>
          <div><p className="text-xs text-cream/45">All-time sales</p><p className="mt-1 text-2xl font-bold tabular">{formatPHP(stats.totalSalesCents)}</p><p className="text-xs text-cream/45">{stats.totalSalesCount} total receipts</p></div>
          <div><p className="text-xs text-cream/45">Utang to collect</p><p className="mt-1 text-2xl font-bold tabular">{formatPHP(stats.utangOutstandingCents)}</p><p className="text-xs text-cream/45">{stats.utangOpenCount} open {stats.utangOpenCount === 1 ? "record" : "records"}</p></div>
          <div><p className="text-xs text-cream/45">Active products</p><p className="mt-1 text-2xl font-bold tabular">{stats.products.toLocaleString("en-PH")}</p><p className="text-xs text-cream/45">{stats.lowStock ? `${stats.lowStock} need attention` : "Stock looks healthy"}</p></div>
        </div>
      </section>

      <section className="mt-8 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-leaf">Your toolkit</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Everything in one POS</h2></div><p className="hidden text-right text-sm text-ink/45 sm:block">Built for the way Filipino stores sell.</p></section>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => <button key={feature.label} type="button" onClick={() => setOpenHref(feature.href)} className="card card-interactive group flex gap-4 p-5 text-left"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${feature.tone}`}><feature.icon className="h-5 w-5" /></span><span className="min-w-0"><span className="flex items-center justify-between gap-2 font-semibold">{feature.label}<ChevronRight className="h-4 w-4 shrink-0 text-ink/25 transition group-hover:translate-x-1 group-hover:text-ink" /></span><span className="mt-1 block text-sm leading-5 text-ink/50">{feature.description}</span></span></button>)}
      </div>

      {ActiveView && openItem && <NavModal title={openItem.label} onClose={() => setOpenHref(null)}><ActiveView /></NavModal>}
      <p className="mt-4 flex items-center gap-2 text-xs text-ink/40"><CreditCard className="h-3.5 w-3.5" /> {storeName} · Data synced to your store account</p>
    </>
  );
}
