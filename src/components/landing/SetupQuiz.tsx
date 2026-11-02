"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Option = {
  value: string;
  label: string;
  note: string;
};

type Question = {
  id: string;
  question: string;
  recommended: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    id: "devices",
    question: "How many devices will record sales?",
    recommended: "many",
    options: [
      { value: "one", label: "One device at a time", note: "Simplest setup." },
      {
        value: "many",
        label: "Several devices share inventory",
        note: "Everything syncs through one central database.",
      },
    ],
  },
  {
    id: "receipts",
    question: "Do you need printed receipts?",
    recommended: "screen",
    options: [
      { value: "screen", label: "On-screen receipts for now", note: "No hardware needed." },
      { value: "thermal", label: "Bluetooth thermal printer", note: "58 mm roll printer." },
      { value: "usb", label: "USB or desktop printer", note: "Plugged into the counter PC." },
    ],
  },
  {
    id: "measure",
    question: "How will you measure rice and feeds?",
    recommended: "manual",
    options: [
      { value: "manual", label: "Enter the weight manually", note: "Type grams or kilos." },
      { value: "digital", label: "Connect a digital scale", note: "Compatible weighing scale." },
      { value: "both", label: "Support both options", note: "Manual and scale together." },
    ],
  },
];

const SUMMARY: Record<string, Record<string, string>> = {
  devices: {
    one: "single-device, local-first",
    many: "multi-device with a central Postgres database and sync queue",
  },
  receipts: {
    screen: "on-screen receipts",
    thermal: "Bluetooth thermal printing",
    usb: "USB / desktop printing",
  },
  measure: {
    manual: "manual weight entry",
    digital: "a connected digital scale",
    both: "manual entry and a connected scale",
  },
};

export function SetupQuiz() {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(QUESTIONS.map((question) => [question.id, question.recommended])),
  );

  const summary = useMemo(() => {
    const parts = QUESTIONS.map(
      (question) => SUMMARY[question.id][answers[question.id]],
    );
    return `Installable PWA · ${parts.join(" · ")}.`;
  }, [answers]);

  function choose(question: Question, option: Option) {
    setAnswers((current) => ({ ...current, [question.id]: option.value }));
    toast({
      title: option.label,
      description: `Plan updated · ${SUMMARY[question.id][option.value]}.`,
      variant: "success",
      duration: 2600,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        {QUESTIONS.map((question, index) => (
          <div key={question.id} className="card p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Question {index + 1}
            </span>
            <h3 className="mt-2 text-lg font-semibold leading-snug">
              {question.question}
            </h3>
            <div className="mt-4 space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => choose(question, option)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-leaf bg-leaf/10"
                        : "border-ink/10 hover:border-ink/25"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        selected ? "border-leaf bg-leaf text-white" : "border-ink/25"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {option.label}
                        {option.value === question.recommended && (
                          <span className="rounded-full bg-mango/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mango">
                            Recommended
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/55">
                        {option.note}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="ink-panel relative overflow-hidden rounded-[2rem] p-6 text-cream sm:p-8">
        <span className="aurora left-10 top-0 h-40 w-40 bg-leaf/30" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-mango">
              <Sparkles className="h-3.5 w-3.5" />
              Your store plan
            </span>
            <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
