import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, homeForRole } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  PASSWORD_MAX_LENGTH,
  normalizeSecurityAnswer,
  passwordProblems,
} from "@/lib/password-policy";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  storeName: z.string().trim().min(2).max(120).default("My Sari-Sari Store"),
  storeOwner: z.string().trim().min(2).max(80).optional(),
  storeAddress: z.string().trim().max(200).nullable().optional(),
  contactNumber: z.string().trim().max(40).nullable().optional(),
  photoUrl: z
    .string()
    .max(2_000_000)
    .refine(
      (value) => /^data:image\/(png|jpe?g|webp);base64,/.test(value),
      "Upload a PNG or JPG image.",
    )
    .nullable()
    .optional(),
  // Required so the owner can always recover their own store.
  securityQuestion: z.string().trim().min(4).max(160),
  securityAnswer: z.string().trim().min(2).max(160),
});

async function uniqueStoreSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;
  while (true) {
    const taken = await prisma.store.findUnique({ where: { slug } });
    if (!taken) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

export async function POST(request: Request) {
  await connection();

  const limited = rateLimit(`signup:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

  const {
    name,
    email: rawEmail,
    password,
    storeName,
    storeOwner,
    storeAddress,
    contactNumber,
    photoUrl,
    securityQuestion,
    securityAnswer,
  } = parsed.data;
  const email = rawEmail.toLowerCase();

  const problems = passwordProblems(password);
  if (problems.length > 0) {
    return NextResponse.json(
      { error: `Password too weak. ${problems.join("; ")}.` },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please log in." },
      { status: 409 },
    );
  }

  try {
    const slug = await uniqueStoreSlug(storeName);

    const user = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          slug,
          address: storeAddress || null,
          phone: contactNumber || null,
          photoUrl: photoUrl || null,
        },
      });
      return tx.user.create({
        data: {
          storeId: store.id,
          name: storeOwner?.trim() || name,
          email,
          role: "OWNER",
          passwordHash: hashPassword(password),
          securityQuestion,
          securityAnswerHash: hashPassword(normalizeSecurityAnswer(securityAnswer)),
          sessionVersion: 0,
        },
      });
    });

    await startSession({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionVersion: user.sessionVersion ?? 0,
    });

    return NextResponse.json(
      { ok: true, redirect: homeForRole(user.role) },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This email or store name is already taken." },
        { status: 409 },
      );
    }
    console.error("Signup failed:", error);
    return NextResponse.json(
      { error: "Could not create the owner account." },
      { status: 500 },
    );
  }
}