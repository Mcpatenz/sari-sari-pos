import { NextResponse, connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { isUniqueViolation } from "@/lib/customer-id";
import { imageDataUrl } from "@/lib/staff";

const customerSchema = z.object({
  customerId: z.string().trim().max(40).nullable().optional(),
  name: z.string().trim().min(2).max(120),
  contactNumber: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  photoUrl: imageDataUrl,
  active: z.boolean().optional().default(true),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid customer data." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const storeId = session.session.storeId;

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (data.customerId && data.customerId !== customer.customerId) {
      const newId = data.customerId.trim();
      if (newId) {
        const existing = await prisma.customer.findUnique({
          where: { storeId_customerId: { storeId, customerId: newId } },
        });
        if (existing) {
          return NextResponse.json({ error: "Customer ID already exists." }, { status: 409 });
        }
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        customerId: data.customerId?.trim() || customer.customerId,
        name: data.name,
        contactNumber: data.contactNumber ?? null,
        address: data.address ?? null,
        photoUrl: data.photoUrl ?? null,
        active: data.active,
      },
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Customer ID already exists." }, { status: 409 });
    }
    console.error("Update customer failed:", error);
    return NextResponse.json({ error: "Unable to update customer." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const storeId = session.session.storeId;

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete customer failed:", error);
    return NextResponse.json({ error: "Unable to delete customer." }, { status: 500 });
  }
}
