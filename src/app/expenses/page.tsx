"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon, Loader2, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput, FloatingSelect } from "@/components/ui/FloatingField";
import { ReceiptPicker } from "@/components/expenses/ReceiptPicker";
import { useToast } from "@/components/ui/Toast";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  type ApiExpense,
} from "@/lib/expenses-api";
import { formatPHP, formatDate, pesoInputToCents } from "@/lib/format";

const CATEGORIES = [
  "General",
  "Electricity",
  "Water",
  "Rent",
  "Transport",
  "Supplies",
  "Salary",
  "Load",
];

export function ExpensesView() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ApiExpense | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listExpenses();
      setExpenses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listExpenses();
        if (active) {
          setExpenses(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load expenses.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amountCents, 0),
    [expenses],
  );

  async function remove(expense: ApiExpense) {
    setBusyId(expense.id);
    try {
      await deleteExpense(expense.id);
      toast({ title: "Expense removed", variant: "success" });
      await reload();
    } catch (err) {
      toast({
        title: "Could not remove expense",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Expenses</h1>
            <p className="text-sm text-ink/55">
              Track store costs so your profit picture stays honest.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4" /> Add expense
          </button>
        </div>

        <div className="card mt-5 flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-berry/10 text-berry">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-ink/55">Total recorded ({expenses.length})</p>
            <p className="text-2xl font-bold tabular">{formatPHP(total)}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {loading ? (
            <div className="card flex items-center gap-2 p-6 text-ink/50">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
              {error}
            </p>
          ) : expenses.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                <Receipt className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink/55">No expenses recorded yet.</p>
            </div>
          ) : (
            expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="card flex items-center gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{expense.description}</p>
                    <p className="text-xs text-ink/50">
                      {expense.category} · {formatDate(expense.spentAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewing(expense)}
                    disabled={!expense.receiptUrl}
                    aria-label={expense.receiptUrl ? "View receipt" : "No receipt"}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/55 transition ${
                      expense.receiptUrl ? "hover:bg-ink/5 hover:text-ink" : "opacity-40"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <span className="font-bold tabular">
                    {formatPHP(expense.amountCents)}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === expense.id}
                    onClick={() => void remove(expense)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-berry transition hover:bg-berry/10 disabled:opacity-50"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <ExpenseForm
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await reload();
          }}
        />
      )}

      {viewing && viewing.receiptUrl && (
        <Modal title="Expense receipt" onClose={() => setViewing(null)}>
          <div className="overflow-hidden rounded-2xl border border-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.receiptUrl} alt="Expense receipt" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 flex justify-end">
            <a
              href={viewing.receiptUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-2xl border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:bg-ink/5"
            >
              Open in new tab
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function ExpensesPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <ExpensesView />
    </div>
  );
}

function ExpenseForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amountCents = pesoInputToCents(amount);
  const invalid = description.trim().length === 0 || amountCents === null || amountCents <= 0;

  async function submit() {
    if (amountCents === null) return;
    setBusy(true);
    try {
      await createExpense({
        description: description.trim(),
        category,
        amountCents,
        spentAt: new Date(`${spentAt}T00:00:00`).toISOString(),
        receiptUrl: receiptUrl || null,
      });
      toast({ title: "Expense saved", variant: "success" });
      await onSaved();
    } catch (err) {
      toast({
        title: "Could not save expense",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) void submit();
        }}
      >
        <FloatingInput
          label="Description"
          value={description}
          onChange={setDescription}
        />
        <FloatingSelect
          label="Category"
          value={category}
          onChange={setCategory}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FloatingSelect>
        <FloatingInput
          label="Amount (₱)"
          value={amount}
          onChange={setAmount}
          inputMode="decimal"
        />
        <FloatingInput
          label="Date"
          value={spentAt}
          onChange={setSpentAt}
          type="date"
        />
        <ReceiptPicker value={receiptUrl} onChange={setReceiptUrl} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || invalid}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save expense
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-ink/15 px-5 py-3.5 font-semibold transition hover:bg-ink/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
