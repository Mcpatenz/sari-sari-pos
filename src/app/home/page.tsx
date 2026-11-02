import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  CloudOff,
  Cpu,
  Database,
  Layers,
  LineChart,
  Package,
  RefreshCw,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { LandingNav } from "@/components/landing/LandingNav";
import { TingiPlayground } from "@/components/landing/TingiPlayground";
import { SellingMethodsTabs } from "@/components/landing/SellingMethodsTabs";
import { SetupQuiz } from "@/components/landing/SetupQuiz";
import { Faq } from "@/components/landing/Faq";
import { FAQS } from "@/lib/faqs";

const TRUST_CHIPS = [
  "Works offline",
  "Tingi & bundle pricing",
  "Kilograms and grams",
  "Sacks and cases",
  "Open price",
  "Multi-device sync",
];

const MARQUEE = [
  "3 sticks for ₱10",
  "₱5 worth of candy",
  "½ kilo of rice",
  "1 sack of feeds",
  "100 mL of cooking oil",
  "1 case of soft drinks",
  "Tingi mode",
  "On-screen receipt",
];

const BASE_UNITS = [
  { product: "Cigarettes", base: "Stick", options: "1 stick · 3 sticks · 1 pack (20)" },
  { product: "Candy", base: "Piece", options: "1 piece · 2 pieces · 10 pieces" },
  { product: "Rice", base: "Gram", options: "250 g · 500 g · 1 kg · 5 kg · sack" },
  { product: "Feeds", base: "Gram", options: "500 g · 1 kg · 5 kg · 50 kg sack" },
  { product: "Cooking oil", base: "Milliliter", options: "100 mL · 250 mL · 1 liter" },
  { product: "Soft drinks", base: "Bottle", options: "1 bottle · 1 case" },
];

const MODULES = [
  {
    icon: Store,
    title: "POS / Cashier",
    points: [
      "Search and scan products",
      "Tingi buttons and custom quantities",
      "Cash received, change and receipts",
      "Discounts, voids and returns",
    ],
  },
  {
    icon: Package,
    title: "Products & inventory",
    points: [
      "SKU, barcode, category and cost",
      "Multiple selling units per product",
      "Low-stock and expiry alerts",
      "Damage and spoilage adjustments",
    ],
  },
  {
    icon: Truck,
    title: "Suppliers & purchases",
    points: [
      "Record supplier invoices",
      "Convert cartons, packs and sacks",
      "Track purchase costs",
      "Supplier balances",
    ],
  },
  {
    icon: LineChart,
    title: "Sales & profit reports",
    points: [
      "Daily, weekly and monthly sales",
      "Estimated gross profit",
      "Best sellers and low stock",
      "Expenses and cash reconciliation",
    ],
  },
  {
    icon: CloudOff,
    title: "Offline & sync",
    points: [
      "Local IndexedDB storage",
      "Pending sync queue",
      "Conflict detection and history",
      "Exportable backups",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Users & devices",
    points: [
      "Owner and cashier accounts",
      "Per-device labels and status",
      "Role-based access",
      "Sync audit trail",
    ],
  },
];

const SYNC_STEPS = [
  {
    title: "Open the app",
    body: "The app shell and previously downloaded product list are already on the device.",
  },
  {
    title: "Keep selling",
    body: "Every sale is saved instantly to the device's local database — no internet required.",
  },
  {
    title: "Update stock locally",
    body: "Each completed sale deducts the exact base units from local stock in real time.",
  },
  {
    title: "Reconnect",
    body: "Queued sales are pushed to the server, which acknowledges each saved record.",
  },
  {
    title: "Sync changes",
    body: "Product updates and inventory adjustments are pulled back using clear conflict rules.",
  },
];

const DB_TABLES = [
  { name: "products", purpose: "Name, category, base unit, cost, stock" },
  { name: "product_units", purpose: "Pack, piece, kilogram, gram, sack conversions" },
  { name: "product_prices", purpose: "Individual prices and quantity-based bundles" },
  { name: "sales", purpose: "Receipt number, date, totals, payment method" },
  { name: "sale_items", purpose: "Product, quantity in base units, applied price" },
  { name: "inventory_movements", purpose: "Additions, sales deductions, adjustments" },
  { name: "purchases", purpose: "Supplier orders and received goods" },
  { name: "expenses", purpose: "Electricity, transportation, other costs" },
  { name: "sync_queue", purpose: "Local changes awaiting server confirmation" },
  { name: "users", purpose: "Owner and cashier accounts" },
];

const CONVERSIONS = [
  { from: "Carton", to: "Sticks", detail: "1 carton → 10 packs → 200 sticks" },
  { from: "Sack", to: "Grams", detail: "1 sack (50 kg) → 50,000 g" },
  { from: "Case", to: "Bottles", detail: "1 case → 24 bottles" },
];

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      variant="up"
      className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-lg text-ink/65">{body}</p>}
    </Reveal>
  );
}

export default function HomePage() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TindahanPOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, iOS, Windows, macOS, Web",
    description:
      "Offline-first sari-sari store POS and inventory for the Philippines with tingi, bundle, kilogram, sack and open-price selling.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "128",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="relative overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <LandingNav />

      {/* ---------------- Hero ---------------- */}
      <section id="top" className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
        <span className="aurora -left-24 top-10 h-72 w-72 bg-leaf/40" />
        <span className="aurora right-0 top-24 h-80 w-80 bg-mango/35" />
        <span className="aurora bottom-0 left-1/3 h-72 w-72 bg-berry/20" />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal variant="up">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-1.5 text-sm font-medium text-ink/70 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
              </span>
              Offline-first POS for the sari-sari store
            </span>
          </Reveal>

          <Reveal variant="up" delay={80}>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Sell by tingi, bundle,
              <br />
              <span className="text-gradient">kilo, sack or open price.</span>
            </h1>
          </Reveal>

          <Reveal variant="up" delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/65 sm:text-xl">
              One installable app for your phone, tablet, laptop and desktop.
              Keep one stock record per product while selling it as a single
              stick, a 3-for-₱10 bundle, half a kilo of rice, or a full sack of
              feeds.
            </p>
          </Reveal>

          <Reveal variant="up" delay={240}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/cashier"
                className="btn btn-primary btn-lg group rounded-full"
              >
                Open the cashier
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/products"
                className="btn btn-secondary btn-lg rounded-full"
              >
                <Package className="h-5 w-5" />
                Manage products
              </Link>
            </div>
          </Reveal>

          <Reveal variant="up" delay={320}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {TRUST_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-ink/10 bg-white/60 px-3 py-1.5 text-xs font-medium text-ink/60"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6">
          <Reveal variant="scale" delay={120}>
            <TingiPlayground />
          </Reveal>
        </div>
      </section>

      {/* ---------------- Marquee ---------------- */}
      <section className="border-y border-ink/10 bg-ink py-4 text-cream">
        <div className="flex w-max marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {MARQUEE.map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-6 px-6">
                  <span className="text-lg font-semibold whitespace-nowrap">{item}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-mango" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Selling modes ---------------- */}
      <section id="selling" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="Selling modes"
          title="Designed for how a real tindahan sells — not just per piece"
          body="A sari-sari store sells the same product in many shapes: a single stick, a bundle, a pack, a kilogram, or a whole sack. TindahanPOS stores each product once and lets you price every one of those ways."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Cigarettes",
              lines: ["1 piece = ₱4.00", "3 pieces = ₱10.00", "1 pack = 20 pieces"],
            },
            {
              icon: Wallet,
              title: "Candy",
              lines: ["1 piece = ₱3.00", "2 pieces = ₱5.00", "10 pieces = ₱22.00"],
            },
            {
              icon: Scale,
              title: "Rice & feeds",
              lines: ["Rice ₱60.00 / kg", "Feeds ₱32.00 / kg", "Sacks and kilos"],
            },
          ].map((card, index) => (
            <Reveal key={card.title} variant="up" delay={index * 90}>
              <div className="lift card h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-mango">
                  <card.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-xl font-bold">{card.title}</h3>
                <ul className="mt-3 space-y-1.5 text-ink/65">
                  {card.lines.map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                      <span className="tabular">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Pricing rules ---------------- */}
      <section id="pricing" className="bg-white/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing rules"
            title="Four pricing methods, applied automatically"
            body="Whether the cashier taps a preset or types a custom amount, the system always charges the right price and deducts the correct inventory."
          />
          <div className="mt-12">
            <Reveal variant="up">
              <SellingMethodsTabs />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- Inventory ---------------- */}
      <section id="inventory" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="Inventory model"
          title="One product, one stock record, many selling options"
          body="Inventory is stored in a base unit, then converted for every selling option. A carton becomes sticks, a sack becomes grams — without creating duplicate products."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CONVERSIONS.map((item, index) => (
            <Reveal key={item.from} variant="up" delay={index * 90}>
              <div className="card flex h-full items-center gap-4 p-5">
                <span className="rounded-xl bg-cream px-3 py-2 text-sm font-bold">
                  {item.from}
                </span>
                <ArrowRight className="h-4 w-4 text-ink/30" />
                <span className="rounded-xl bg-leaf/10 px-3 py-2 text-sm font-bold text-leaf">
                  {item.to}
                </span>
                <span className="ml-auto text-right text-xs text-ink/55">
                  {item.detail}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal variant="up" delay={120}>
          <div className="mt-8 overflow-hidden rounded-3xl border border-ink/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/70 text-ink/55">
                  <tr>
                    <th className="p-4 font-semibold">Product</th>
                    <th className="p-4 font-semibold">Inventory base unit</th>
                    <th className="p-4 font-semibold">Selling options</th>
                  </tr>
                </thead>
                <tbody>
                  {BASE_UNITS.map((row) => (
                    <tr key={row.product} className="border-t border-ink/5">
                      <td className="p-4 font-semibold">{row.product}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold">
                          {row.base}
                        </span>
                      </td>
                      <td className="p-4 text-ink/65">{row.options}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Offline & sync ---------------- */}
      <section id="offline" className="relative overflow-hidden py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <SectionHeading
                eyebrow="Offline & sync"
                title="Keep selling when the internet drops"
                body="Built as a Progressive Web App with local storage first. Sales never wait on the network, and sync runs quietly when connectivity returns."
              />
              <Reveal variant="up" delay={120}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium">
                    <Cpu className="h-4 w-4 text-leaf" />
                    IndexedDB on every device
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium">
                    <RefreshCw className="h-4 w-4 text-mango" />
                    Pending to synced status
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium">
                    <Database className="h-4 w-4 text-ink" />
                    Central Postgres backup
                  </span>
                </div>
              </Reveal>
            </div>

            <Reveal variant="left" delay={100}>
              <ol className="relative space-y-4 border-l border-dashed border-ink/20 pl-8">
                {SYNC_STEPS.map((step, index) => (
                  <li key={step.title} className="relative">
                    <span className="absolute -left-[41px] grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-cream">
                      {index + 1}
                    </span>
                    <div className="card p-4">
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-sm text-ink/60">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          <Reveal variant="up" delay={140}>
            <div className="mt-10 rounded-3xl border border-mango/30 bg-mango/10 p-6">
              <p className="font-semibold text-ink">One thing to know about offline</p>
              <p className="mt-2 text-sm text-ink/70">
                Offline work happens independently on each device. If your phone
                and laptop are both offline, a sale on the phone won&apos;t appear
                on the laptop until both reconnect. Duplicate sales are prevented
                during retries and every transaction shows a clear{" "}
                <strong>Synced</strong> or <strong>Pending Sync</strong> badge.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Modules ---------------- */}
      <section id="modules" className="bg-ink py-20 text-cream sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal variant="up" className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mango">
              The complete system
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Six modules that run your whole store
            </h2>
            <p className="mt-4 text-lg text-cream/60">
              From the counter to supplier invoices to end-of-day profit — every
              piece works offline and syncs when you reconnect.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module, index) => (
              <Reveal key={module.title} variant="up" delay={index * 70}>
                <div className="group h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-mango/50 hover:bg-white/[0.07]">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mango text-ink">
                    <module.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{module.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-cream/60">
                    {module.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Database design ---------------- */}
      <section id="data" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="Data model"
          title="Pricing lives beside the product, not inside it"
          body="Storing pricing rules separately lets one product carry several selling options without duplicating stock. A sale of three sticks saves a quantity of 3 in the base unit with a line total of ₱10; 1.5 kg of rice saves 1500 grams."
        />

        <Reveal variant="up" delay={100}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-ink/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/70 text-ink/55">
                  <tr>
                    <th className="p-4 font-semibold">Table</th>
                    <th className="p-4 font-semibold">Main purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {DB_TABLES.map((table) => (
                    <tr key={table.name} className="border-t border-ink/5">
                      <td className="p-4">
                        <code className="rounded-lg bg-ink/5 px-2 py-1 font-mono text-xs font-semibold text-ink">
                          {table.name}
                        </code>
                      </td>
                      <td className="p-4 text-ink/65">{table.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Boxes, label: "3 sticks", detail: "saved as quantity 3, ₱10.00" },
            { icon: Scale, label: "1.5 kg rice", detail: "saved as 1500 grams" },
            { icon: ClipboardList, label: "1 sack feeds", detail: "saved as 50,000 grams" },
          ].map((item, index) => (
            <Reveal key={item.label} variant="up" delay={index * 80}>
              <div className="card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-leaf/10 text-leaf">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-ink/55">{item.detail}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Setup ---------------- */}
      <section id="setup" className="bg-white/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Set up your store"
            title="Tell us how you operate — we'll shape the build"
            body="Tap an answer in each question. The plan below updates live to match how your tindahan actually runs."
          />
          <div className="mt-12">
            <Reveal variant="up">
              <SetupQuiz />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions sari-sari owners ask"
          align="center"
        />
        <div className="mt-12">
          <Reveal variant="up">
            <Faq />
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="px-4 pb-24 sm:px-6">
        <Reveal variant="scale">
          <div className="ink-panel relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] px-6 py-16 text-center text-cream sm:px-16">
            <span className="aurora left-10 top-0 h-48 w-48 bg-leaf/30" />
            <span className="aurora bottom-0 right-10 h-48 w-48 bg-mango/30" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to run your tindahan from any device?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-cream/65">
                Start with the cashier, load your products, and let the system
                handle tingi, bundles, kilos and sacks.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/cashier"
                  className="btn btn-gold btn-lg rounded-full"
                >
                  Open the cashier
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/products"
                  className="btn btn-ghost btn-lg rounded-full border-white/20 text-cream hover:bg-white/10"
                >
                  Add your products
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-ink/10 bg-cream py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-mango">
                <Store className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold">TindahanPOS</span>
            </div>
            <p className="mt-3 text-sm text-ink/60">
              An offline-first point of sale and inventory system built for
              sari-sari stores in the Philippines.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <a href="#selling" className="text-ink/60 transition hover:text-ink">
              Selling modes
            </a>
            <a href="#pricing" className="text-ink/60 transition hover:text-ink">
              Pricing rules
            </a>
            <a href="#inventory" className="text-ink/60 transition hover:text-ink">
              Inventory
            </a>
            <a href="#offline" className="text-ink/60 transition hover:text-ink">
              Offline &amp; sync
            </a>
            <a href="/cashier" className="text-ink/60 transition hover:text-ink">
              Cashier
            </a>
            <a href="/products" className="text-ink/60 transition hover:text-ink">
              Products
            </a>
            <a href="/sales" className="text-ink/60 transition hover:text-ink">
              Sales history
            </a>
            <a href="#faq" className="text-ink/60 transition hover:text-ink">
              FAQ
            </a>
          </nav>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-ink/10 px-4 pt-6 text-sm text-ink/45 sm:px-6">
          <p>
            © 2026 TindahanPOS · Prices in Philippine peso (₱) · Built for the
            neighbourhood store.
          </p>
        </div>
      </footer>
    </div>
  );
}
