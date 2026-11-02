"use client";

import { useEffect, useState } from "react";
import { Loader2, QrCode, ShieldCheck, Store, Upload, X } from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import {
  FloatingInput,
  FloatingSelect,
  FloatingTextarea,
} from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import { fetchStore, saveStore, type ApiStore } from "@/lib/store-api";
import { setStoreProfile } from "@/lib/db";
import { apiRequest, jsonBody } from "@/lib/api-client";
import { imageFileToDataUrl, imageFileToJpegDataUrl } from "@/lib/image";
import { SECURITY_QUESTIONS } from "@/lib/password-policy";

export function SettingsView() {
  const { toast } = useToast();
  const [store, setStore] = useState<ApiStore | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [businessOpenTime, setBusinessOpenTime] = useState("08:00");
  const [businessCloseTime, setBusinessCloseTime] = useState("18:00");
  const [gcashQr, setGcashQr] = useState<string | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [readingQr, setReadingQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchStore();
        if (!active) return;
        setStore(data);
        setName(data.name);
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
        setPhotoUrl(data.photoUrl ?? null);
        setBusinessOpenTime(data.businessOpenTime ?? "08:00");
        setBusinessCloseTime(data.businessCloseTime ?? "18:00");
        setGcashQr(data.gcashQrDataUrl ?? null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load the store.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setReadingPhoto(true);
    try {
      setPhotoUrl(await imageFileToJpegDataUrl(file, 900));
    } catch (err) {
      toast({
        title: "Could not read that image",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setReadingPhoto(false);
    }
  }

  async function pickQr(file: File | undefined) {
    if (!file) return;
    setReadingQr(true);
    try {
      setGcashQr(await imageFileToDataUrl(file));
    } catch (err) {
      toast({
        title: "Could not read that image",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setReadingQr(false);
    }
  }

  async function save() {
    if (name.trim().length < 2) return;
    setBusy(true);
    try {
      const data = await saveStore({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        photoUrl,
        businessOpenTime,
        businessCloseTime,
        gcashQrDataUrl: gcashQr,
      });
      setStore(data);
      // Refresh the offline copy so receipts and the cashier QR update immediately.
      await setStoreProfile({
        name: data.name,
        address: data.address,
        phone: data.phone,
        gcashQr: data.gcashQrDataUrl,
      });
      toast({ title: "Store details saved", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Store settings
          </h1>
          <p className="text-sm text-ink/55">
            This name, address and phone number are printed on every receipt.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-ink/50">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
            {error}
          </p>
        ) : (
          <div className="card mt-5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Store"
                  className="h-11 w-11 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-mango">
                  <Store className="h-5 w-5" />
                </span>
              )}
              <div>
                <p className="font-semibold">{store?.name}</p>
                <p className="text-xs text-ink/45">
                  {store?.slug ? `/${store.slug}` : "No slug"} · {store?.status}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-ink/10 p-4">
                <p className="text-sm font-semibold">Store photo</p>
                <p className="mt-1 text-xs text-ink/45">
                  A logo or photo of your store.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt="Store photo"
                      className="h-24 w-24 rounded-xl border border-ink/10 object-cover"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-ink/20 bg-white text-center text-xs text-ink/40">
                      No photo
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-leaf hover:text-leaf ${
                        readingPhoto ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {readingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {photoUrl ? "Replace photo" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={readingPhoto}
                        onChange={(event) => {
                          void pickPhoto(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-berry transition hover:bg-berry/10"
                      >
                        <X className="h-3.5 w-3.5" /> Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <FloatingInput label="Store name" value={name} onChange={setName} />
              <FloatingTextarea
                label="Address (optional)"
                value={address}
                onChange={setAddress}
                rows={2}
              />
              <FloatingInput
                label="Phone number (optional)"
                value={phone}
                onChange={setPhone}
              />
              <div className="rounded-2xl border border-ink/10 p-4">
                <p className="text-sm font-semibold">Business hours</p>
                <p className="mt-1 text-xs text-ink/45">Cashier access is disabled outside these hours.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FloatingInput label="Opening time" type="time" value={businessOpenTime} onChange={setBusinessOpenTime} />
                  <FloatingInput label="Closing time" type="time" value={businessCloseTime} onChange={setBusinessCloseTime} />
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">GCash QR code</p>
                    <p className="text-xs text-ink/45">
                      Shown to the customer when they pay with GCash at the cashier.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {gcashQr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gcashQr}
                      alt="GCash payment QR code"
                      className="h-32 w-32 rounded-xl border border-ink/10 bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="grid h-32 w-32 place-items-center rounded-xl border border-dashed border-ink/20 bg-white text-center text-xs text-ink/40">
                      No QR yet
                    </div>
                  )}

                  <div className="flex flex-col items-start gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-leaf hover:text-leaf ${
                        readingQr ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {readingQr ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {gcashQr ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={readingQr}
                        onChange={(event) => {
                          void pickQr(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {gcashQr && (
                      <button
                        type="button"
                        onClick={() => setGcashQr(null)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-berry transition hover:bg-berry/10"
                      >
                        <X className="h-3.5 w-3.5" /> Remove QR
                      </button>
                    )}
                    <p className="text-[11px] text-ink/40">
                      PNG or JPG. Screenshot from your GCash app.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || name.trim().length < 2}
              onClick={() => void save()}
              className="btn btn-primary btn-lg mt-6 w-full"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save store details
            </button>
          </div>
        )}

        <SecurityQuestionCard />
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <SettingsView />
    </div>
  );
}

function SecurityQuestionCard() {
  const { toast } = useToast();
  const [question, setQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [hasQuestion, setHasQuestion] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ question: string | null }>("/api/auth/security-question")
      .then((data) => {
        if (!active) return;
        if (data.question) {
          setQuestion(data.question);
          setHasQuestion(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const options = showQuestion(question);

  async function save() {
    if (answer.trim().length < 2) return;
    setBusy(true);
    try {
      await apiRequest("/api/auth/security-question", {
        method: "PUT",
        ...jsonBody({ question, answer: answer.trim() }),
      });
      setHasQuestion(true);
      setAnswer("");
      toast({ title: "Recovery question saved", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf/10 text-leaf">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">Account security</p>
          <p className="text-xs text-ink/45">
            {hasQuestion
              ? "Your recovery question is set. You can change it anytime."
              : "Set a question so you can reset your password if you forget it."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-ink/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <FloatingSelect
            label="Security question"
            value={question}
            onChange={setQuestion}
          >
            {options.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FloatingSelect>
          <FloatingInput
            label={hasQuestion ? "New answer" : "Your answer"}
            value={answer}
            onChange={setAnswer}
            hint="Answers are case-insensitive and stored securely."
          />
          <button
            type="button"
            disabled={busy || answer.trim().length < 2}
            onClick={() => void save()}
            className="btn btn-primary btn-lg w-full"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {hasQuestion ? "Update recovery question" : "Save recovery question"}
          </button>
        </div>
      )}
    </div>
  );
}

function showQuestion(current: string): string[] {
  return current && !SECURITY_QUESTIONS.includes(current)
    ? [current, ...SECURITY_QUESTIONS]
    : SECURITY_QUESTIONS;
}
