import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth-core";
import { normalizeSecurityAnswer } from "@/lib/password-policy";

const schema = z.object({
  question: z.string().trim().min(4).max(160),
  answer: z.string().trim().min(2).max(160),
});

/** Read the signed-in user's recovery question (never the answer). */
export async function GET(request: Request) {
  await connection();

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { securityQuestion: true },
  });

  return NextResponse.json({ question: user?.securityQuestion ?? null });
}

/** Set or change the signed-in user's recovery question and answer. */
export async function PUT(request: Request) {
  await connection();

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pick a question and provide an answer." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: auth.session.userId },
    data: {
      securityQuestion: parsed.data.question,
      securityAnswerHash: hashPassword(
        normalizeSecurityAnswer(parsed.data.answer),
      ),
    },
  });

  return NextResponse.json({ ok: true, question: parsed.data.question });
}
