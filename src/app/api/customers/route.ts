import { NextResponse, connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { nextCustomerId, isUniqueViolation } from "@/lib/customer-id";
import { imageDataUrl } from "@/lib/staff";

const customerSchema = z.object({
  customerId: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2).max(120),
  contactNumber: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  photoUrl: imageDataUrl,
});

export async function GET(request: Request) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "10", 10));

  const where: Prisma.CustomerWhereInput = {
    storeId: session.session.storeId,
    active: true,
  };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { customerId: { contains: search, mode: "insensitive" } },
      { contactNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.customer.count({ where });
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(request: Request) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid customer data." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const storeId = session.session.storeId;

  let customerId = data.customerId?.trim() || "";
  if (!customerId) {
    customerId = await nextCustomerId(storeId);
  }

  try {
    const existing = await prisma.customer.findUnique({
      where: { storeId_customerId: { storeId, customerId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Customer ID already exists." }, { status: 409 });
    }

    const customer = await prisma.customer.create({
      data: {
        storeId,
        customerId,
        name: data.name,
        contactNumber: data.contactNumber ?? null,
        address: data.address ?? null,
        photoUrl: data.photoUrl ?? null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Customer ID already exists." }, { status: 409 });
    }
    console.error("Create customer failed:", error);
    return NextResponse.json({ error: "Unable to create customer." }, { status: 500 });
  }
}
