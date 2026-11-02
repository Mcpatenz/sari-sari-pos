"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Full-page popup used by the owner dashboard sidebar. It hosts a page's view
 * in a large scrollable panel so the owner can work without leaving the
 * dashboard. Nested dialogs (rendered by the view itself) sit above this one
 * because they use a higher z-index.
 */
export function NavModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // If the view opened its own dialog, let that dialog handle Escape first.
      if (bodyRef.current?.querySelector(".fixed.inset-0")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-ink/60 sm:items-center sm:p-6">
      <div className="flex h-full max-h-full w-full flex-col overflow-hidden border border-ink/10 bg-cream shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-white/85 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs text-ink/55">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-icon btn-sm shrink-0 text-ink/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
