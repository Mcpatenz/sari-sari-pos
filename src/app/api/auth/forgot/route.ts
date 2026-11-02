import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(160),
});

/**
 * Step one of recovery: hand back the account's security question so the user
 * can answer it. Returns the same shape whether or not the account exists to
 * avoid leaking which emails are registered.
 */
export async function POST(request: Request) {
  await connection();

  const limited = rateLimit(`forgot:${clientIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { securityQuestion: true, active: true },
    });

    if (user?.active && user.securityQuestion) {
      return NextResponse.json({ question: user.securityQuestion });
    }
  } catch (error) {
    console.error("Recovery lookup failed:", error);
    return NextResponse.json(
      { error: "Could not reach the account service. Please try again." },
      { status: 503 },
    );
  }

  // Unknown, inactive, or question-less accounts get a stable decoy question
  // instead of a 404, so this endpoint cannot be used to enumerate emails.
  return NextResponse.json({ question: decoyQuestion(email) });
}

const DECOY_QUESTIONS = [
  "What city were you born in?",
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
];

function decoyQuestion(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0;
  }
  return DECOY_QUESTIONS[Math.abs(hash) % DECOY_QUESTIONS.length];
}
