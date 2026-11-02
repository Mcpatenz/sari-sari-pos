"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

function wrapperClass(active: boolean, className?: string) {
  return `floating ${active ? "is-active" : ""} ${className ?? ""}`;
}

type Shared = {
  label: string;
  value: string;
  hint?: ReactNode;
  className?: string;
};

export function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  min,
  step,
  required,
  name,
  hint,
  className,
}: Shared & {
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  min?: string | number;
  step?: string | number;
  required?: boolean;
  name?: string;
}) {
  const id = useId();
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={wrapperClass(value !== "", className)}>
      <input
        id={id}
        className={`floating-control ${isPassword ? "has-trailing" : ""}`}
        placeholder={placeholder ?? " "}
        value={value}
        type={isPassword && revealed ? "text" : type}
        inputMode={inputMode}
        min={min}
        step={step}
        required={required}
        name={name}
        autoComplete={isPassword ? "current-password" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <label htmlFor={id} className="floating-label">
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-label={revealed ? "Hide password" : "Show password"}
          title={revealed ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink/40 transition hover:bg-ink/5 hover:text-ink"
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
      {hint && <p className="mt-1.5 px-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

export function FloatingSelect({
  label,
  value,
  onChange,
  children,
  hint,
  className,
}: Shared & {
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={wrapperClass(true, className)}>
      <select
        id={id}
        className="floating-control has-trailing appearance-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <label htmlFor={id} className="floating-label">
        {label}
      </label>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden>
          <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      {hint && <p className="mt-1.5 px-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

export function FloatingTextarea({
  label,
  value,
  onChange,
  hint,
  className,
  rows = 3,
}: Shared & {
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className={wrapperClass(value !== "", className)}>
      <textarea
        id={id}
        className="floating-control resize-none"
        placeholder=" "
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <label htmlFor={id} className="floating-label">
        {label}
      </label>
      {hint && <p className="mt-1.5 px-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
