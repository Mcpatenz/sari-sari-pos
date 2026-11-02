"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import {
  FloatingInput,
  FloatingSelect,
  FloatingTextarea,
} from "@/components/ui/FloatingField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { useToast } from "@/components/ui/Toast";
import { updateProfile, type ApiProfile } from "@/lib/profile-api";
import { isStrongPassword } from "@/lib/password-policy";

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function ProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ApiProfile;
  onClose: () => void;
  onSaved: (profile: ApiProfile) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [contactNumber, setContactNumber] = useState(profile.contactNumber ?? "");
  const [birthdate, setBirthdate] = useState(toDateInput(profile.birthdate));
  const [gender, setGender] = useState(profile.gender ?? "");
  const [civilStatus, setCivilStatus] = useState(profile.civilStatus ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [dateHired, setDateHired] = useState(toDateInput(profile.dateHired));
  const [photo, setPhoto] = useState<string | null>(profile.photoUrl);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const passwordOk = password === "" || isStrongPassword(password);
  const invalid =
    name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || !passwordOk;

  async function submit() {
    setBusy(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        address: address.trim() || null,
        birthdate: birthdate || null,
        gender: gender || null,
        civilStatus: civilStatus || null,
        contactNumber: contactNumber.trim() || null,
        dateHired: dateHired || null,
        photoUrl: photo,
        ...(password ? { password } : {}),
      });
      toast({
        title: "Profile updated",
        description: password
          ? "You stay signed in here; other devices were signed out."
          : undefined,
        variant: "success",
      });
      onSaved(updated);
    } catch (err) {
      toast({
        title: "Could not save profile",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
      setBusy(false);
    }
  }

  return (
    <Modal
      title="My profile"
      subtitle="Keep your contact details up to date."
      onClose={onClose}
      size="lg"
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid && !busy) void submit();
        }}
      >
        <AvatarPicker value={photo} name={name} onChange={setPhoto} />

        <div className="grid gap-3 sm:grid-cols-2">
          <FloatingInput label="Full name" value={name} onChange={setName} />
          <FloatingInput
            label="Contact number"
            value={contactNumber}
            onChange={setContactNumber}
            inputMode="numeric"
          />
          <FloatingInput
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
          />
          <FloatingInput
            label="Date hired"
            value={dateHired}
            onChange={setDateHired}
            type="date"
          />
          <FloatingInput
            label="Birthdate"
            value={birthdate}
            onChange={setBirthdate}
            type="date"
          />
          <FloatingSelect
            label="Gender"
            value={gender}
            onChange={setGender}
          >
            <option value="">Not set</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </FloatingSelect>
          <FloatingSelect
            label="Civil status"
            value={civilStatus}
            onChange={setCivilStatus}
          >
            <option value="">Not set</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </FloatingSelect>
        </div>

        <FloatingTextarea
          label="Address"
          value={address ?? ""}
          onChange={(v) => setAddress(String(v || ""))}
          rows={2}
        />

        <FloatingInput
          label="New password (optional)"
          value={password}
          onChange={setPassword}
          type="password"
        />
        <PasswordStrength value={password} />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || invalid}
            className="btn btn-primary btn-lg flex-1"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
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
