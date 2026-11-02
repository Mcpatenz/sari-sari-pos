"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & { id: string };

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; icon: ReactNode; bar: string }
> = {
  success: {
    ring: "border-leaf/30",
    bar: "bg-leaf",
    icon: <CheckCircle2 className="h-5 w-5 text-leaf" />,
  },
  error: {
    ring: "border-berry/30",
    bar: "bg-berry",
    icon: <XCircle className="h-5 w-5 text-berry" />,
  },
  warning: {
    ring: "border-mango/40",
    bar: "bg-mango",
    icon: <TriangleAlert className="h-5 w-5 text-mango" />,
  },
  info: {
    ring: "border-ink/15",
    bar: "bg-ink",
    icon: <Info className="h-5 w-5 text-ink" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { ...input, id }].slice(-4));
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const variant = item.variant ?? "info";
  const style = VARIANT_STYLES[variant];
  const duration = item.duration ?? 4200;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), duration);
    return () => clearTimeout(timer);
  }, [duration, item.id, onDismiss]);

  return (
    <div
      role="status"
      className={`toast-item pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-[0_24px_50px_-28px_rgba(7,12,24,0.55)] backdrop-blur ${style.ring}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="flex items-start gap-3 pl-2">
        <span className="mt-0.5 shrink-0">{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{item.title}</p>
          {item.description && (
            <p className="mt-0.5 text-sm text-ink/65">{item.description}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(item.id)}
          className="rounded-lg p-1 text-ink/40 transition hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
}
