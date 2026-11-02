import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { homeForRole, verifyPassword } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(120),
});

// Per-account lockout so an attacker cannot grind one account from many IPs.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  await connection();

  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute.", retryAfter: limited.retryAfterSeconds },
      { status: 429 },
    );
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400 },
    );
  }

  try {
    // Emails are stored lower-cased so casing can never fork an account.
    const { email: rawEmail, password } = parsed.data;
    const email = rawEmail.toLowerCase();

    // Email is globally unique, so a single lookup is unambiguous.
    const user = await prisma.user.findUnique({
      where: { email },
      include: { store: { select: { status: true } } },
    });

    // Block sign-in while a lockout from repeated failures is still active.
    const now = Date.now();
    if (user?.lockedUntil && user.lockedUntil.getTime() > now) {
      const retryAfterSeconds = Math.ceil(
        (user.lockedUntil.getTime() - now) / 1000,
      );
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${Math.ceil(
            retryAfterSeconds / 60,
          )} minute(s).`,
          retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      // Count the failure for real accounts and lock after too many in a row.
      if (user) {
        const attempts = (user.failedLoginAttempts ?? 0) + 1;
        await prisma.user.update({
          where: { id: user.id },
          data:
            attempts >= MAX_FAILED_ATTEMPTS
              ? {
                  failedLoginAttempts: 0,
                  lockedUntil: new Date(now + LOCK_DURATION_MS),
                }
              : { failedLoginAttempts: attempts },
        });
      }
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    if (!user.active || user.store.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This account or store is not active." },
        { status: 403 },
      );
    }

    const sessionVersion = user.sessionVersion ?? 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await startSession({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionVersion,
    });

    return NextResponse.json({ ok: true, redirect: homeForRole(user.role) });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Could not sign you in. Please try again." },
      { status: 500 },
    );
  }
}