"use client";

import { Check, Circle } from "lucide-react";
import { passwordChecks, passwordStrength } from "@/lib/password-policy";

const BAR_COLOR: Record<number, string> = {
  0: "bg-berry",
  1: "bg-berry",
  2: "bg-mango",
  3: "bg-leaf",
  4: "bg-leaf",
};

const LABEL_COLOR: Record<number, string> = {
  0: "text-berry",
  1: "text-berry",
  2: "text-mango",
  3: "text-leaf",
  4: "text-leaf",
};

export function PasswordStrength({ value }: { value: string }) {
  if (value.length === 0) return null;

  const { score, label } = passwordStrength(value);
  const checks = passwordChecks(value);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink/55">Password strength</span>
        <span className={`font-bold ${LABEL_COLOR[score]}`}>{label}</span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < score ? BAR_COLOR[score] : "bg-ink/10"
            }`}
          />
        ))}
      </div>

      <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`flex items-center gap-1.5 text-xs ${
              check.ok ? "text-leaf" : "text-ink/50"
            }`}
          >
            {check.ok ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-2.5 w-2.5 shrink-0" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
