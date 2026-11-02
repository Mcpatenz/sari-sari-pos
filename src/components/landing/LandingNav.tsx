"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBasket, X } from "lucide-react";

const LINKS = [
  { href: "#selling", label: "Selling modes" },
  { href: "#pricing", label: "Pricing rules" },
  { href: "#inventory", label: "Inventory" },
  { href: "#offline", label: "Offline & sync" },
  { href: "#modules", label: "Modules" },
  { href: "#setup", label: "Set up" },
];

export function LandingNav() {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? (doc.scrollTop / max) * 100 : 0);
      setScrolled(doc.scrollTop > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[100]">
      <div
        className={`transition-all duration-300 ${
          scrolled ? "glass shadow-[0_10px_30px_-24px_rgba(7,12,24,0.7)]" : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-ink text-mango">
              <ShoppingBasket className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-cream bg-leaf" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-ink">
                TindahanPOS
              </span>
              <span className="block text-[11px] font-medium text-ink/55">
                Sari-sari store system
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink lg:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/products"
              className="btn btn-secondary btn-sm hidden rounded-full sm:inline-flex"
            >
              Manage products
            </Link>
            <Link
              href="/cashier"
              className="btn btn-primary btn-sm rounded-full"
            >
              Open POS
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-white/70 lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="border-t border-ink/10 px-4 pb-4 pt-2 lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:bg-ink/5"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-xl bg-ink/5 px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/10"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      <div className="h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-leaf via-mango to-berry transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
