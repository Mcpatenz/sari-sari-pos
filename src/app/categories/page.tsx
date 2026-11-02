"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  type ApiCategory,
} from "@/lib/categories-api";
import { refreshProductsFromServer } from "@/lib/products-api";

export function CategoriesView() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<ApiCategory | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await listCategories();
      setCategories(list);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load categories.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    listCategories()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Could not load categories.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openAdd() {
    setEditing(null);
    setName("");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(category: ApiCategory) {
    setEditing(category);
    setName(category.name);
    setFormError(null);
    setShowForm(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Enter a category name.");
      return;
    }
    if (editing && trimmed === editing.name) {
      setShowForm(false);
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        const result = await renameCategory(editing.name, trimmed);
        await refreshProductsFromServer().catch(() => {});
        toast({
          title: "Category updated",
          description:
            result.movedProducts > 0
              ? `${result.movedProducts} product${result.movedProducts === 1 ? "" : "s"} moved to ${trimmed}.`
              : undefined,
          variant: "success",
        });
      } else {
        await createCategory(trimmed);
        toast({ title: `${trimmed} added`, variant: "success" });
      }
      setShowForm(false);
      setEditing(null);
      setName("");
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save the category.";
      setFormError(message);
      toast({ title: "Could not save category", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await deleteCategory(deleting.name);
      await refreshProductsFromServer().catch(() => {});
      toast({
        title: `${deleting.name} deleted`,
        description:
          result.movedProducts > 0
            ? `${result.movedProducts} product${result.movedProducts === 1 ? "" : "s"} moved to General.`
            : undefined,
        variant: "success",
      });
      setDeleting(null);
      await reload();
    } catch (err) {
      toast({
        title: "Could not delete category",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const totalProducts = categories.reduce(
    (sum, category) => sum + category.productCount,
    0,
  );

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Product categories
            </h1>
            <p className="text-sm text-ink/55">
              Organise inventory into categories. Renaming or deleting a
              category updates every product in it.
            </p>
          </div>
          <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
              Categories
            </p>
            <p className="mt-1 text-2xl font-bold tabular">{categories.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
              Products covered
            </p>
            <p className="mt-1 text-2xl font-bold tabular">{totalProducts}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
              Fallback
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink/70">
              <Tags className="h-4 w-4 text-leaf" /> General
            </p>
            <p className="mt-0.5 text-xs text-ink/45">
              Deleted categories move here.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-berry/20 bg-berry/5 px-4 py-3 text-sm text-berry">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void reload().finally(() => setLoading(false));
              }}
              className="btn btn-secondary btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="card h-32 animate-pulse p-5">
                <div className="h-10 w-10 rounded-2xl bg-ink/10" />
                <div className="mt-3 h-4 w-32 rounded-full bg-ink/10" />
                <div className="mt-2 h-3 w-20 rounded-full bg-ink/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const isFallback =
                category.name.toLowerCase() === "general";
              return (
                <article
                  key={category.name.toLowerCase()}
                  className="card flex flex-col gap-3 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-leaf/10 text-leaf">
                      <Tags className="h-5 w-5" />
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded-lg p-2 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
                        title={`Rename ${category.name}`}
                        aria-label={`Rename ${category.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        disabled={isFallback}
                        className="rounded-lg p-2 text-berry transition hover:bg-berry/10 disabled:cursor-not-allowed disabled:opacity-30"
                        title={
                          isFallback
                            ? "General is the fallback category"
                            : `Delete ${category.name}`
                        }
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold tracking-tight">
                        {category.name}
                      </h2>
                      {isFallback && (
                        <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink/50">
                      {category.productCount}{" "}
                      {category.productCount === 1 ? "product" : "products"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal
          title={editing ? "Rename category" : "Add category"}
          subtitle={
            editing
              ? `Products in ${editing.name} will move to the new name.`
              : "New categories become available when adding products."
          }
          onClose={() => {
            if (busy) return;
            setShowForm(false);
            setEditing(null);
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <FloatingInput
              label="Category name"
              value={name}
              onChange={(value) => {
                setName(value);
                setFormError(null);
              }}
            />
            {formError && (
              <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="btn btn-primary btn-sm"
              >
                {editing ? "Save changes" : "Add category"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          subtitle="This cannot be undone."
          onClose={() => {
            if (busy) return;
            setDeleting(null);
          }}
        >
          <p className="text-sm leading-6 text-ink/65">
            {deleting.productCount > 0
              ? `${deleting.productCount} product${deleting.productCount === 1 ? "" : "s"} in this category will be moved to General.`
              : "This category has no products."}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleting(null)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmDelete()}
              className="btn btn-danger btn-sm"
            >
              <Trash2 className="h-4 w-4" /> Delete category
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <CategoriesView />
    </div>
  );
}
