import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-auth";
import { imageDataUrl } from "@/lib/staff";

const expenseSchema = z.object({
  description: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(60).default("General"),
  amountCents: z.number().int().positive(),
  spentAt: z.string().datetime().optional(),
  receiptUrl: imageDataUrl,
});

export async function GET() {
  await connection();

  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;

  const expenses = await prisma.expense.findMany({
    where: { storeId: auth.session.storeId },
    orderBy: { spentAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid expense." },
      { status: 400 },
    );
  }

  const { description, category, amountCents, spentAt, receiptUrl } = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        storeId: auth.session.storeId,
        userId: auth.session.userId,
        description,
        category,
        amountCents,
        receiptUrl: receiptUrl || null,
        ...(spentAt ? { spentAt: new Date(spentAt) } : {}),
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("POST expense failed:", error);
    return NextResponse.json(
      { error: "Unable to save the expense." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing expense id." }, { status: 400 });
  }

  const existing = await prisma.expense.findFirst({
    where: { id, storeId: auth.session.storeId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
