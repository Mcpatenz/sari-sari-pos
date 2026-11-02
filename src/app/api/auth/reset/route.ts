import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth-core";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  PASSWORD_MAX_LENGTH,
  normalizeSecurityAnswer,
  passwordProblems,
} from "@/lib/password-policy";

const schema = z.object({
  email: z.string().trim().email().max(160),
  answer: z.string().trim().min(1).max(160),
  newPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

/**
 * Step two of recovery: verify the security answer and set a new password.
 * Buys the account out of any login lockout and revokes every existing session.
 */
export async function POST(request: Request) {
  await connection();

  const ip = clientIp(request);
  const limited = rateLimit(`reset:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in every field." },
      { status: 400 },
    );
  }

  const { email: rawEmail, answer, newPassword } = parsed.data;
  const email = rawEmail.toLowerCase();

  const problems = passwordProblems(newPassword);
  if (problems.length > 0) {
    return NextResponse.json(
      { error: `Password too weak. ${problems.join("; ")}.` },
      { status: 400 },
    );
  }

  const user = await prisma.user
    .findUnique({
      where: { email },
      select: { id: true, active: true, securityAnswerHash: true },
    })
    .catch(() => null);

  if (
    !user ||
    !user.active ||
    !user.securityAnswerHash ||
    !verifyPassword(normalizeSecurityAnswer(answer), user.securityAnswerHash)
  ) {
    return NextResponse.json(
      { error: "That answer is not correct." },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      sessionVersion: { increment: 1 },
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ ok: true });
}
