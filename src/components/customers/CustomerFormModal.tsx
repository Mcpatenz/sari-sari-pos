"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput, FloatingTextarea } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import { AvatarPicker } from "@/components/ui/AvatarPicker";

export type CustomerRecord = {
  id: string;
  customerId: string;
  name: string;
  contactNumber: string | null;
  address: string | null;
  photoUrl: string | null;
  active?: boolean;
  createdAt: string;
};

export function CustomerFormModal({
  customer,
  onClose,
  onSaved,
}: {
  customer?: CustomerRecord | null;
  onClose: () => void;
  onSaved: (customer: CustomerRecord) => void;
}) {
  const editing = Boolean(customer);
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(customer?.customerId ?? "");
  const [autoId, setAutoId] = useState("");
  const [name, setName] = useState(customer?.name ?? "");
  const [contactNumber, setContactNumber] = useState(customer?.contactNumber ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(customer?.photoUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/customers/next-id", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.customerId) setAutoId(data.customerId as string);
      } catch {
        // Preview only; the server assigns the real id on save.
      }
    })();
    return () => {
      active = false;
    };
  }, [editing]);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast({ title: "Enter the customer's name", variant: "warning" });
      return;
    }

    const payload: Record<string, unknown> = {
      name: trimmedName,
      contactNumber: contactNumber.trim() || null,
      address: address.trim() || null,
      photoUrl: photoUrl || null,
    };

    setSaving(true);
    try {
      if (editing && customer) {
        payload.customerId = customerId.trim();
        const res = await fetch(`/api/customers/${customer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to update customer");
        toast({ title: "Customer updated", variant: "success" });
        onSaved(data.customer as CustomerRecord);
      } else {
        // No customerId is sent: the server generates the date + count id.
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to add customer");
        toast({ title: "Customer added", variant: "success" });
        onSaved(data.customer as CustomerRecord);
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to save",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={editing ? "Edit customer" : "Add customer"}>
      <div className="space-y-4">
        {editing ? (
          <FloatingInput
            label="Customer ID"
            name="customerId"
            value={customerId}
            onChange={setCustomerId}
            required
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-cream/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Customer ID
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wide">
              {autoId || "Generating…"}
            </p>
            <p className="text-xs text-ink/45">
              Generated from today&apos;s date and running count.
            </p>
          </div>
        )}

        <FloatingInput
          label="Customer Name"
          name="name"
          value={name}
          onChange={setName}
          required
        />
        <FloatingInput
          label="Contact Number"
          name="contact"
          value={contactNumber}
          onChange={setContactNumber}
        />
        <FloatingTextarea label="Address" value={address} onChange={setAddress} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
            Photo
          </p>
          <AvatarPicker name="photo" value={photoUrl} onChange={setPhotoUrl} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-ink/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-ink/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="btn btn-primary btn-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
