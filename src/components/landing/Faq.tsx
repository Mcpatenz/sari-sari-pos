"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { FAQS } from "@/lib/faqs";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {FAQS.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.q}
            className={`card overflow-hidden transition-colors ${
              open ? "border-leaf/40" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <span className="font-semibold">{item.q}</span>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                  open ? "bg-leaf text-white" : "bg-ink/5 text-ink/60"
                }`}
              >
                {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
            <div
              className={`grid transition-all duration-500 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-ink/65">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
