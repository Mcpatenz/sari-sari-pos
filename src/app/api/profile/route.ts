import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
import { PASSWORD_MAX_LENGTH, passwordProblems } from "@/lib/password-policy";
import {
  address as addressField,
  civilStatus as civilStatusField,
  contactNumber as contactNumberField,
  dateOnly,
  gender as genderField,
  imageDataUrl,
  parseDateOnly,
} from "@/lib/staff";

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  employeeId: true,
  address: true,
  birthdate: true,
  gender: true,
  civilStatus: true,
  contactNumber: true,
  dateHired: true,
  photoUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).optional(),
  address: addressField,
  birthdate: dateOnly,
  gender: genderField,
  civilStatus: civilStatusField,
  contactNumber: contactNumberField,
  dateHired: dateOnly,
  photoUrl: imageDataUrl,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH).optional(),
});

export async function GET() {
  await connection();

  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const profile = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: PROFILE_SELECT,
  });
  if (!profile) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  await connection();

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile details." },
      { status: 400 },
    );
  }

  const id = auth.session.userId;
  const current = await prisma.user.findUnique({
    where: { id },
    select: { email: true, sessionVersion: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const {
    name,
    address,
    birthdate,
    gender,
    civilStatus,
    contactNumber,
    dateHired,
    photoUrl,
    password,
  } = parsed.data;

  let email: string | undefined;
  if (parsed.data.email !== undefined) {
    email = parsed.data.email.toLowerCase();
    if (email !== current.email) {
      const taken = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken && taken.id !== id) {
        return NextResponse.json(
          { error: "That email is already used by another account." },
          { status: 409 },
        );
      }
    }
  }

  if (password !== undefined) {
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `Password too weak. ${problems.join("; ")}.` },
        { status: 400 },
      );
    }
  }

  // Changing the password signs out every other device; this one keeps going
  // with a re-issued cookie so the user is not logged out of the page they are on.
  const revoke = password !== undefined;
  const sessionVersion = revoke
    ? current.sessionVersion + 1
    : current.sessionVersion;

  try {
    const profile = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(birthdate !== undefined
          ? { birthdate: parseDateOnly(birthdate) }
          : {}),
        ...(gender !== undefined ? { gender: gender || null } : {}),
        ...(civilStatus !== undefined
          ? { civilStatus: civilStatus || null }
          : {}),
        ...(contactNumber !== undefined
          ? { contactNumber: contactNumber || null }
          : {}),
        ...(dateHired !== undefined ? { dateHired: parseDateOnly(dateHired) } : {}),
        ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
        ...(password !== undefined ? { passwordHash: hashPassword(password) } : {}),
        ...(revoke ? { sessionVersion } : {}),
      },
      select: PROFILE_SELECT,
    });

    if (name !== undefined || email !== undefined || revoke) {
      await startSession({
        userId: profile.id,
        storeId: auth.session.storeId,
        role: profile.role,
        name: profile.name,
        email: profile.email,
        sessionVersion,
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PUT profile failed:", error);
    return NextResponse.json(
      { error: "Unable to save your profile." },
      { status: 500 },
    );
  }
}
