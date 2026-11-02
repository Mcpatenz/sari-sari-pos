"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, Trash2, X } from "lucide-react";
import { imageFileToDataUrl, resizeDataUrl } from "@/lib/image";
import { useToast } from "@/components/ui/Toast";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function AvatarPicker({
  value,
  name,
  onChange,
}: {
  value: string | null;
  name: string;
  onChange: (value: string | null) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => stopStream, []);

  useEffect(() => {
    if (!camera) return;
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
    }
  }, [camera]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await imageFileToDataUrl(file, 320));
    } catch {
      toast({ title: "Could not read that image", variant: "error" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      setCamera(true);
    } catch {
      toast({
        title: "Camera unavailable",
        description: "Allow camera access or upload a photo instead.",
        variant: "error",
      });
    }
  }

  function closeCamera() {
    setCamera(false);
    stopStream();
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const size = Math.min(video.videoWidth, video.videoHeight) || 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(
        video,
        (video.videoWidth - size) / 2,
        (video.videoHeight - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size,
      );
      onChange(await resizeDataUrl(canvas.toDataURL("image/png"), 320));
    }
    closeCamera();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink/10 bg-ink/5 text-lg font-bold text-ink/50">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(name)
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
        >
          <ImageUp className="h-3.5 w-3.5" /> Upload
        </button>
        <button
          type="button"
          onClick={() => void openCamera()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
        >
          <Camera className="h-3.5 w-3.5" /> Camera
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-berry/30 px-3 py-2 text-xs font-semibold text-berry transition hover:bg-berry/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      {camera && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-bold">Take a photo</p>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="btn btn-secondary btn-icon btn-sm text-ink/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl bg-ink">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => void capture()}
                className="btn btn-primary flex-1"
              >
                Capture
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-2xl border border-ink/15 px-5 py-3 font-semibold transition hover:bg-ink/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
