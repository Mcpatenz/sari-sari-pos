"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Barcode, Camera, CameraOff, Keyboard, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera permission was denied. Allow camera access, or type the code instead.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No camera was found on this device. Type the code instead.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is busy in another app. Close it, or type the code instead.";
    }
  }
  return "Could not start the camera. Type the code instead.";
}

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning needs HTTPS or localhost. Type the code instead.");
      setStarting(false);
      return;
    }

    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 120,
    });

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        video,
        (result) => {
          const code = result?.getText().trim() ?? "";
          if (!code || code.length < 3 || detectedRef.current) return;
          detectedRef.current = true;
          navigator.vibrate?.(60);
          // Stop the stream before handing the code back so the camera light
          // turns off immediately and the modal can close cleanly.
          controlsRef.current?.stop();
          controlsRef.current = null;
          onDetectedRef.current(code);
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(cameraErrorMessage(err));
        setStarting(false);
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  return (
    <Modal
      title="Scan barcode or QR"
      subtitle="Point the camera at the product code"
      onClose={onClose}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {!error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-44 w-4/5 max-w-xs">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-mango" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-2 border-t-2 border-mango" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-2 border-l-2 border-mango" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-mango" />
              <span className="scanline absolute inset-x-3 top-1/2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-mango to-transparent shadow-[0_0_12px_rgba(245,185,66,0.8)]" />
            </div>
          </div>
        )}

        {starting && !error && (
          <div className="absolute inset-0 grid place-items-center bg-ink/60 text-cream">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-ink/90 p-6 text-center text-cream">
            <div>
              <CameraOff className="mx-auto h-8 w-8 text-mango" />
              <p className="mt-3 text-sm font-semibold">Camera unavailable</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-cream/60">{error}</p>
            </div>
          </div>
        )}

        <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1 text-[11px] font-semibold text-cream/80 backdrop-blur">
          {error ? <Barcode className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          {error ? "Manual entry ready" : "QR · EAN · UPC · Code 128"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-ink/10 bg-cream/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink/70">
          <Keyboard className="h-4 w-4" /> Or type the code
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const code = manual.trim();
            if (code) onDetected(code);
          }}
        >
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="e.g. 4800016644938"
            inputMode="numeric"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink/30 focus:ring-4 focus:ring-ink/5"
          />
          <button type="submit" disabled={!manual.trim()} className="btn btn-primary btn-sm shrink-0">
            Use code
          </button>
        </form>
      </div>
    </Modal>
  );
}
