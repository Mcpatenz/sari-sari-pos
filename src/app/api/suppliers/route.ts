import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-auth";

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  await connection();

  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;

  const suppliers = await prisma.supplier.findMany({
    where: { storeId: auth.session.storeId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ suppliers });
}

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = supplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid supplier." },
      { status: 400 },
    );
  }

  const { name, phone, note } = parsed.data;

  try {
    const supplier = await prisma.supplier.create({
      data: {
        storeId: auth.session.storeId,
        name,
        phone: phone || null,
        note: note || null,
      },
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error("POST supplier failed:", error);
    return NextResponse.json(
      { error: "Unable to save the supplier." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing supplier id." }, { status: 400 });
  }

  const parsed = supplierSchema.partial().safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid supplier." },
      { status: 400 },
    );
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, storeId: auth.session.storeId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
  }

  const { name, phone, note, active } = parsed.data;

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(note !== undefined ? { note: note || null } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("PUT supplier failed:", error);
    return NextResponse.json(
      { error: "Unable to update the supplier." },
      { status: 500 },
    );
  }
}
