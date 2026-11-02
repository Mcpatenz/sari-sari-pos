"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, ImagePlus, Loader2, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";
import { AppBar } from "@/components/pos/AppBar";
import { Modal } from "@/components/ui/Modal";
import { FloatingInput, FloatingSelect } from "@/components/ui/FloatingField";
import { useToast } from "@/components/ui/Toast";
import {
  createUser,
  listUsers,
  updateUser,
  type ApiUser,
} from "@/lib/users-api";
import { formatDateTime } from "@/lib/format";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { isStrongPassword } from "@/lib/password-policy";
import { nextEmployeeId } from "@/lib/employee-id";

export function CashiersView() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
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
        const data = await listUsers();
        if (active) {
          setUsers(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load accounts.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggleActive(user: ApiUser) {
    setBusyId(user.id);
    try {
      await updateUser(user.id, { active: !user.active });
      toast({
        title: user.active ? `${user.name} deactivated` : `${user.name} reactivated`,
        variant: "success",
      });
      await reload();
    } catch (err) {
      toast({
        title: "Could not update account",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cashiers &amp; users
            </h1>
            <p className="text-sm text-ink/55">
              Give each staff member their own login. Deactivating revokes their
              sessions everywhere.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <UserPlus className="h-4 w-4" /> Add cashier
          </button>
        </div>

        <div className="card mt-5 overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-ink/50">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading accounts…
            </div>
          ) : error ? (
            <div className="p-8">
              <p className="rounded-2xl bg-berry/10 px-4 py-3 text-sm text-berry">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink/40">
                <Users className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink/55">No accounts yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink/45">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Employee ID</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Last login</th>
                  <th className="p-4 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-ink/5">
                    <td className="p-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-ink/45">{user.email ?? "—"}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-ink/70">
                      {user.employeeId ?? "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                          user.role === "OWNER"
                            ? "bg-ink text-cream"
                            : "bg-ink/5 text-ink/60"
                        }`}
                      >
                        {user.role === "OWNER" && <ShieldCheck className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                          user.active
                            ? "bg-leaf/10 text-leaf"
                            : "bg-berry/10 text-berry"
                        }`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-ink/60">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(user);
                            setShowForm(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-1.5 text-xs font-semibold transition hover:border-leaf hover:text-leaf"
                        >
                          <UserCog className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() => void toggleActive(user)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            user.active
                              ? "border-berry/30 text-berry hover:bg-berry/10"
                              : "border-leaf/30 text-leaf hover:bg-leaf/10"
                          }`}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <UserForm
          initial={editing}
          existingIds={users.map((user) => user.employeeId)}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditing(null);
            await reload();
          }}
        />
      )}
    </>
  );
}

export default function CashiersPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <CashiersView />
    </div>
  );
}

function UserForm({
  initial,
  existingIds,
  onClose,
  onSaved,
}: {
  initial: ApiUser | null;
  existingIds: Array<string | null>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "CASHIER">(initial?.role ?? "CASHIER");
  const [contactNumber, setContactNumber] = useState(initial?.contactNumber ?? "");
  const [dateHired, setDateHired] = useState(
    initial?.dateHired ? initial.dateHired.slice(0, 10) : "",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? null);
  const [busy, setBusy] = useState(false);

  // Preview the id the server will assign (surname + current month + store-wide next count).
  const previewId =
    !initial && name.trim().length >= 2
      ? nextEmployeeId(existingIds, name.trim())
      : null;

  const passwordOk = initial
    ? password === "" || isStrongPassword(password)
    : isStrongPassword(password);
  const invalid =
    name.trim().length < 2 ||
    (!initial && !/^\S+@\S+\.\S+$/.test(email.trim())) ||
    !passwordOk;

  async function submit() {
    setBusy(true);
    try {
      if (initial) {
        await updateUser(initial.id, {
          name: name.trim(),
          role,
          active,
          contactNumber: contactNumber.trim() || null,
          dateHired: dateHired || null,
          ...(password ? { password } : {}),
        });
        toast({ title: `${name.trim()} updated`, variant: "success" });
      } else {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          contactNumber: contactNumber.trim() || null,
          dateHired: dateHired || null,
          photoUrl,
        });
        toast({
          title: `${name.trim()} added`,
          description: "They can sign in with the email and password you set.",
          variant: "success",
        });
      }
      await onSaved();
    } catch (err) {
      toast({
        title: "Could not save account",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={initial ? "Edit account" : "New cashier"}
      subtitle={
        initial
          ? "Leave the password blank to keep the current one."
          : "They sign in with this email and password."
      }
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) void submit();
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-ink/10 p-3">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ink/5 text-ink/40">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Employee preview"
                className="size-full object-cover"
              />
            ) : (
              <Camera className="size-5" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/12 px-3 py-2 text-xs font-semibold hover:border-leaf hover:text-leaf"><ImagePlus className="size-4" /> Upload photo<input type="file" accept="image/*" capture="user" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPhotoUrl(String(reader.result)); reader.readAsDataURL(file); }} /></label>
            {photoUrl && <button type="button" onClick={() => setPhotoUrl(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-berry hover:bg-berry/10">Remove</button>}
          </div>
        </div>
        <FloatingInput label="Full name" value={name} onChange={setName} />
        <FloatingInput
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FloatingInput
            label="Contact number"
            value={contactNumber}
            onChange={setContactNumber}
            inputMode="numeric"
          />
          <FloatingInput
            label="Date hired"
            value={dateHired}
            onChange={setDateHired}
            type="date"
          />
        </div>
        {previewId && (
          <p className="rounded-2xl bg-leaf/10 px-4 py-3 text-sm text-leaf">
            Employee ID{" "}
            <span className="font-mono font-bold">{previewId}</span> will be
            assigned.
          </p>
        )}
        <FloatingInput
          label={initial ? "New password (optional)" : "Password"}
          value={password}
          onChange={setPassword}
          type="password"
        />
        <PasswordStrength value={password} />
        <FloatingSelect
          label="Role"
          value={role}
          onChange={(value) => setRole(value as "OWNER" | "CASHIER")}
        >
          <option value="CASHIER">Cashier (till only)</option>
          <option value="OWNER">Owner (full access)</option>
        </FloatingSelect>

        {initial && (
          <FloatingSelect
            label="Status"
            value={active ? "active" : "inactive"}
            onChange={(value) => setActive(value === "active")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FloatingSelect>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || invalid}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save changes" : "Add cashier"}
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
