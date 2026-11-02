"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, ShoppingBasket, Sparkles } from "lucide-react";
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import {
  FloatingInput,
  FloatingSelect,
} from "@/components/ui/FloatingField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { useToast } from "@/components/ui/Toast";
import { imageFileToJpegDataUrl } from "@/lib/image";
import { SECURITY_QUESTIONS, isStrongPassword } from "@/lib/password-policy";

type Mode = "setup" | "login" | "forgot";

export function LoginScreen() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [checking, setChecking] = useState(true);
  const [hasStores, setHasStores] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(true);
  const [storeOwner, setStoreOwner] = useState("");
  const [storeName, setStoreName] = useState("My Sari-Sari Store");
  const [storeAddress, setStoreAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    // Never let a sleeping database keep the form hidden behind a spinner.
    fetch("/api/auth/status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(
        (data: {
          needsSetup?: boolean;
          hasStores?: boolean;
          databaseReady?: boolean;
        }) => {
          if (!active) return;
          setDatabaseReady(data.databaseReady !== false);
          setHasStores(Boolean(data.hasStores));
          if (data.needsSetup) setMode("setup");
        },
      )
      .catch(() => {
        // Leave the sign-in form usable; the server will report a real
        // database failure if there is one.
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const isSetup = mode === "setup";

  async function submit() {
    setError(null);

    if (isSetup) {
      if (storeOwner.trim().length < 2) {
        setError("Enter the store owner name.");
        toast({ variant: "error", title: "Enter store owner name", description: "Please provide a valid name." });
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError("Enter a valid email.");
        toast({ variant: "error", title: "Invalid email", description: "Please enter a valid email address." });
        return;
      }
      if (!isStrongPassword(password)) {
        setError("Choose a stronger password.");
        toast({ variant: "error", title: "Weak password", description: "Meet every requirement shown under the password field." });
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        toast({ variant: "error", title: "Passwords do not match", description: "Please re-enter your password." });
        return;
      }
      if (securityAnswer.trim().length < 2) {
        setError("Enter an answer to your security question.");
        toast({ variant: "error", title: "Security answer needed", description: "This lets you recover your account." });
        return;
      }
    } else if (!email.trim() || !password) {
      setError("Enter your email and password.");
      toast({ variant: "error", title: "Missing details", description: "Enter your email and password." });
      return;
    }

    setBusy(true);
    try {
      const endpoint = isSetup ? "/api/auth/signup" : "/api/auth/login";
      const body = isSetup
        ? {
            name: storeOwner.trim(),
            email: email.trim(),
            password,
            storeName: storeName.trim(),
            storeOwner: storeOwner.trim(),
            storeAddress: storeAddress.trim() || null,
            contactNumber: contactNumber.trim() || null,
            photoUrl: photoUrl || null,
            securityQuestion,
            securityAnswer: securityAnswer.trim(),
          }
        : { email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };

      if (!response.ok) {
        const message =
          data.error ??
          (isSetup
            ? "We couldn't create your store. Please try again."
            : "Something went wrong. Please try again.");
        setError(message);
        toast({
          variant: "error",
          title: isSetup ? "Could not create store" : "Sign in failed",
          description: message,
        });
        return;
      }

      const nextParam = new URLSearchParams(window.location.search).get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : null;

      // Full page load so the offline database re-namespaces to this store
      // (the store id cookie was just set by the server).
      window.location.assign(safeNext || data.redirect || "/cashier");
    } catch {
      setError("Network error. Please check your connection.");
      toast({ variant: "error", title: "Network error", description: "Please check your connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <span className="aurora absolute -left-24 -top-24 h-96 w-96 rounded-full bg-leaf/30 blur-3xl" />
        <span className="aurora absolute bottom-0 right-0 h-80 w-80 rounded-full bg-mango/25 blur-3xl [animation-delay:1.2s]" />

        <Link href="/home" className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cream text-ink">
            <ShoppingBasket className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold tracking-tight">TindahanPOS</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            Your store,
            <br />
            open for business.
          </h1>
          <p className="mt-5 text-cream/70">
            Every sari-sari store gets its own workspace with its own products,
            inventory, cashiers and receipts — secure from every other store.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-cream/80">
            {[
              "Works without internet",
              "Shared inventory across devices",
              "Your data is isolated per store",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-leaf/20 text-leaf">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-cream/45">
          Prices in Philippine peso (₱). Built for the neighbourhood store.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-12">
        {mode === "forgot" ? (
          <ForgotPassword onBack={() => setMode("login")} />
        ) : (
        <div className="mx-auto w-full max-w-sm">
          <div className="mt-8">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-mango">
              <Lock className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              {isSetup ? "Create your store" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {isSetup
                ? "Set up a private workspace for your tindahan. You become its owner."
                : "Sign in to continue to your dashboard."}
            </p>
          </div>

          {checking && (
            <p className="mt-6 flex items-center gap-2 text-xs text-ink/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking store status…
            </p>
          )}

          {!databaseReady && (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-mango/35 bg-mango/10 px-4 py-3 text-sm text-ink/75"
            >
              <p className="font-semibold text-ink">Database not connected</p>
              <p className="mt-0.5 text-ink/60">
                Sign-in is temporarily unavailable. Add a valid
                <code className="mx-1 rounded bg-ink/5 px-1 py-0.5 text-xs">
                  DATABASE_URL
                </code>
                and restart the app.
              </p>
            </div>
          )}
            <form
              className="mt-8 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {isSetup && (
                <>
                  <FloatingInput
                    label="Store owner"
                    value={storeOwner}
                    onChange={setStoreOwner}
                  />
                  <FloatingInput
                    label="Store name"
                    value={storeName}
                    onChange={setStoreName}
                  />
                  <FloatingInput
                    label="Store address"
                    value={storeAddress}
                    onChange={setStoreAddress}
                  />
                  <FloatingInput
                    label="Contact number"
                    value={contactNumber}
                    onChange={setContactNumber}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink/60">Store photo</span>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl(null)}
                          className="text-xs font-semibold text-berry hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {photoUrl ? (
                      <div className="relative overflow-hidden rounded-2xl border border-ink/12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt="Store" className="h-32 w-full object-cover" />
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/60 transition hover:border-leaf hover:text-ink">
                        <span className="font-semibold">Upload photo</span>
                        <span className="text-xs">PNG or JPG (max ~2MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            imageFileToJpegDataUrl(file, 900)
                              .then(setPhotoUrl)
                              .catch(() =>
                                toast({
                                  variant: "error",
                                  title: "Could not read that image",
                                }),
                              );
                          }}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}

              <FloatingInput
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
              />
              <FloatingInput
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
              />
              {isSetup && (
                <>
                  <PasswordStrength value={password} />
                  <FloatingInput
                    label="Confirm password"
                    value={confirm}
                    onChange={setConfirm}
                    type="password"
                  />
                  <FloatingSelect
                    label="Security question"
                    value={securityQuestion}
                    onChange={setSecurityQuestion}
                    hint="Used to recover your account if you forget your password."
                  >
                    {SECURITY_QUESTIONS.map((question) => (
                      <option key={question} value={question}>
                        {question}
                      </option>
                    ))}
                  </FloatingSelect>
                  <FloatingInput
                    label="Your answer"
                    value={securityAnswer}
                    onChange={setSecurityAnswer}
                  />
                </>
              )}

              {error && (
                <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !databaseReady}
                aria-busy={busy}
                className="btn btn-primary btn-lg mt-1 w-full"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSetup ? "Create store & open dashboard" : "Sign in"}
              </button>

              {!isSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("forgot");
                  }}
                  className="w-full text-center text-sm font-semibold text-ink/60 transition hover:text-ink"
                >
                  Forgot password?
                </button>
              )}
            </form>

          {hasStores && (
            <button
              type="button"
              onClick={() => setMode(isSetup ? "login" : "setup")}
              className="btn btn-secondary mt-5 w-full"
            >
              {isSetup ? "Already have a store? Sign in" : "New here? Create a store"}
            </button>
          )}

          <p className="mt-6 text-center text-xs text-ink/45">
            One store, one sign-up. Your email is your log-in across devices.
          </p>
        </div>
        )}
      </main>
    </div>
  );
}