"use client";

import { useState } from "react";
import {
  Boxes,
  Layers,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Method = {
  key: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  example: string;
  detail: string;
};

const METHODS: Method[] = [
  {
    key: "piece",
    label: "Per piece",
    icon: Layers,
    title: "Sell one at a time",
    description:
      "One candy costs ₱3. The cashier taps 4 pieces and the total becomes ₱12. Stock drops by exactly 4.",
    example: "4 pieces × ₱3.00",
    detail: "= ₱12.00",
  },
  {
    key: "bundle",
    label: "Bundle / tier",
    icon: Boxes,
    title: "Three sticks for ₱10",
    description:
      "Even if a single stick is ₱4, the bundle price wins. The engine always finds the cheapest valid combination.",
    example: "3 sticks (bundle)",
    detail: "= ₱10.00, not ₱12.00",
  },
  {
    key: "weight",
    label: "By weight",
    icon: Scale,
    title: "Rice by the kilo or gram",
    description:
      "Rice at ₱60/kg is stored internally as 6,000 centavos per 1000 grams, so 1.5 kg is exact every time.",
    example: "1.5 kg × ₱60.00",
    detail: "= ₱90.00",
  },
  {
    key: "open",
    label: "Open price",
    icon: Wallet,
    title: "₱20 worth of rice",
    description:
      "The cashier enters the amount, and the system converts it into the equivalent weight at the current price per kilogram.",
    example: "₱20.00 ÷ ₱60.00 per kg",
    detail: "≈ 333 g",
  },
];

export function SellingMethodsTabs() {
  const { toast } = useToast();
  const [activeKey, setActiveKey] = useState(METHODS[0].key);
  const active = METHODS.find((method) => method.key === activeKey) as Method;
  const ActiveIcon = active.icon;

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {METHODS.map((method) => {
          const Icon = method.icon;
          const isActive = method.key === active.key;
          return (
            <button
              key={method.key}
              type="button"
              onClick={() => setActiveKey(method.key)}
              className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition lg:w-full ${
                isActive
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/10 bg-white text-ink hover:border-ink/25"
              }`}
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                  isActive ? "bg-mango text-ink" : "bg-cream text-ink/70"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{method.label}</span>
                <span
                  className={`block text-[11px] ${
                    isActive ? "text-cream/60" : "text-ink/50"
                  }`}
                >
                  {method.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="card relative overflow-hidden p-6 sm:p-8">
        <span className="aurora -right-10 -top-10 h-40 w-40 bg-leaf/25" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink/60">
            <ActiveIcon className="h-3.5 w-3.5" />
            {active.label}
          </span>
          <h3 className="mt-4 text-2xl font-bold tracking-tight">{active.title}</h3>
          <p className="mt-3 max-w-xl text-ink/65">{active.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-cream/70 p-4">
            <span className="tabular text-lg font-semibold">{active.example}</span>
            <span className="text-ink/30">→</span>
            <span className="tabular text-2xl font-bold text-leaf">{active.detail}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              toast({
                title: `${active.label} pricing mapped`,
                description: `${active.example} ${active.detail}`,
                variant: "success",
              })
            }
            className="btn btn-primary btn-sm mt-6 rounded-full"
          >
            See it on the receipt
          </button>
        </div>
      </div>
    </div>
  );
}
