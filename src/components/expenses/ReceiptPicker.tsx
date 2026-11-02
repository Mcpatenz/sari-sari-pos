"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Receipt, Trash2 } from "lucide-react";
import { imageFileToJpegDataUrl } from "@/lib/image";
import { useToast } from "@/components/ui/Toast";

/**
 * Lets the owner attach a photo of a paper receipt to an expense. The image is
 * downscaled to a JPEG data URL so it stays small enough to store with the row.
 * On phones the picker offers the camera, so a receipt can be snapped directly.
 */
export function ReceiptPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await imageFileToJpegDataUrl(file));
    } catch {
      toast({ title: "Could not read that image", variant: "error" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
        Receipt photo <span className="normal-case tracking-normal">(optional)</span>
      </p>
      <div className="flex items-start gap-3">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink/10 bg-ink/5 text-ink/40">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Receipt" className="h-full w-full object-cover" />
          ) : (
            <Receipt className="h-6 w-6" />
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-ink/60" />
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold transition hover:border-leaf hover:text-leaf disabled:opacity-50"
          >
            <ImageUp className="h-3.5 w-3.5" /> {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-berry/30 px-3 py-2 text-xs font-semibold text-berry transition hover:bg-berry/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
          <p className="w-full text-xs text-ink/45">
            Snap or upload the receipt if you have one.
          </p>
        </div>
      </div>
    </div>
  );
}
