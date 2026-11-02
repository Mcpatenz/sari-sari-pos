import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

async function requireSuperAdmin(request: Request) {
  const result = await requireSession(request);
  if (result instanceof NextResponse) return result;
  if (result.session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super admin access required." }, { status: 403 });
  }
  return result;
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, products: true, sales: true } } },
  });
  return NextResponse.json({ stores });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : undefined;
  if (!name) return NextResponse.json({ error: "Store name is required." }, { status: 400 });
  try {
    const store = await prisma.store.create({ data: { name, slug: slug || undefined, address: body?.address?.trim() || undefined, phone: body?.phone?.trim() || undefined } });
    return NextResponse.json({ store }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A store with that slug may already exist." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Store id is required." }, { status: 400 });
  const data = {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    slug: typeof body.slug === "string" ? body.slug.trim().toLowerCase() || null : undefined,
    address: typeof body.address === "string" ? body.address.trim() || null : undefined,
    phone: typeof body.phone === "string" ? body.phone.trim() || null : undefined,
    status: body.status === "SUSPENDED" ? "SUSPENDED" as const : body.status === "ACTIVE" ? "ACTIVE" as const : undefined,
  };
  try {
    const store = await prisma.store.update({ where: { id: body.id }, data });
    return NextResponse.json({ store });
  } catch {
    return NextResponse.json({ error: "Unable to update store." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Store id is required." }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { sale: { storeId: body.id } } });
      await tx.purchaseItem.deleteMany({ where: { purchase: { storeId: body.id } } });
      await tx.inventoryMovement.deleteMany({ where: { storeId: body.id } });
      await tx.expense.deleteMany({ where: { storeId: body.id } });
      await tx.purchase.deleteMany({ where: { storeId: body.id } });
      await tx.sale.deleteMany({ where: { storeId: body.id } });
      await tx.product.deleteMany({ where: { storeId: body.id } });
      await tx.supplier.deleteMany({ where: { storeId: body.id } });
      await tx.customer.deleteMany({ where: { storeId: body.id } });
      await tx.device.deleteMany({ where: { storeId: body.id } });
      await tx.user.deleteMany({ where: { storeId: body.id } });
      await tx.store.delete({ where: { id: body.id } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete store." }, { status: 400 });
  }
}
