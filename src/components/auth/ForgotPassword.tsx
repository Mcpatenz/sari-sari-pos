"use client";

import { useState } from "react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { FloatingInput } from "@/components/ui/FloatingField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { useToast } from "@/components/ui/Toast";
import { isStrongPassword } from "@/lib/password-policy";

type Step = "email" | "answer" | "done";

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function findAccount() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        question?: string;
        error?: string;
      };
      if (!response.ok || !data.question) {
        setError(data.error ?? "Could not find that account.");
        return;
      }
      setQuestion(data.question);
      setStep("answer");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError(null);
    if (answer.trim().length === 0) {
      setError("Enter your answer.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          answer: answer.trim(),
          newPassword: password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not reset the password.");
        return;
      }
      setStep("done");
      toast({
        title: "Password updated",
        description: "Sign in with your new password.",
        variant: "success",
      });
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <button
        type="button"
        onClick={onBack}
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>

      <div className="mt-6">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-mango">
          <KeyRound className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          {step === "done" ? "All set" : "Reset your password"}
        </h2>
        <p className="mt-1 text-sm text-ink/55">
          {step === "email"
            ? "Enter your email to answer your security question."
            : step === "answer"
              ? "Answer your security question to set a new password."
              : "Your password has been changed and all devices were signed out."}
        </p>
      </div>

      {step === "email" && (
        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void findAccount();
          }}
        >
          <FloatingInput label="Email" value={email} onChange={setEmail} type="email" />
          {error && (
            <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary btn-lg w-full"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
        </form>
      )}

      {step === "answer" && (
        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void resetPassword();
          }}
        >
          <div className="rounded-2xl border border-ink/12 bg-white/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
              Security question
            </p>
            <p className="mt-0.5 text-sm font-medium">{question}</p>
          </div>
          <FloatingInput label="Your answer" value={answer} onChange={setAnswer} />
          <FloatingInput
            label="New password"
            value={password}
            onChange={setPassword}
            type="password"
          />
          <PasswordStrength value={password} />
          <FloatingInput
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            type="password"
          />
          {error && (
            <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary btn-lg w-full"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </button>
        </form>
      )}

      {step === "done" && (
        <button
          type="button"
          onClick={onBack}
          className="btn btn-primary btn-lg mt-8 w-full"
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}
