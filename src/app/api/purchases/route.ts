import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-auth";

const purchaseSchema = z.object({
  supplierId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(240).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityBase: z.number().int().positive(),
        // What the whole line cost, so owners can enter a sack total directly.
        lineTotalCents: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(200),
});

export async function GET() {
  await connection();

  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;

  const purchases = await prisma.purchase.findMany({
    where: { storeId: auth.session.storeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { kind: true } } } },
    },
  });

  return NextResponse.json({ purchases });
}

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid purchase." },
      { status: 400 },
    );
  }

  const { supplierId, note, items } = parsed.data;
  const storeId = auth.session.storeId;

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      if (supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: supplierId, storeId },
          select: { id: true },
        });
        if (!supplier) throw new Error("Supplier not found.");
      }

      const productIds = [...new Set(items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId },
        select: { id: true, name: true },
      });
      if (products.length !== productIds.length) {
        throw new Error("A product in this purchase no longer exists.");
      }
      const nameById = new Map(products.map((p) => [p.id, p.name]));

      const totalCents = items.reduce(
        (sum, item) => sum + item.lineTotalCents,
        0,
      );

      const created = await tx.purchase.create({
        data: {
          storeId,
          supplierId: supplierId ?? null,
          userId: auth.session.userId,
          totalCents,
          note: note ?? null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: nameById.get(item.productId) as string,
              quantityBase: item.quantityBase,
              unitCostCents: Math.round(item.lineTotalCents / item.quantityBase),
            })),
          },
        },
        include: { items: true, supplier: { select: { id: true, name: true } } },
      });

      for (const item of items) {
        const unitCostCents = Math.round(item.lineTotalCents / item.quantityBase);
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockBaseUnits: { increment: item.quantityBase },
            // Keep the cost basis fresh for profit estimates.
            ...(unitCostCents > 0 ? { costPerBaseCents: unitCostCents } : {}),
          },
        });
        await tx.inventoryMovement.create({
          data: {
            storeId,
            productId: item.productId,
            userId: auth.session.userId,
            kind: "RESTOCK",
            quantityBase: item.quantityBase,
            note: note ?? `Purchase ${created.id}`,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      /not found|no longer exists/i.test(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Stock changed at the same time. Please retry." },
        { status: 409 },
      );
    }
    console.error("POST purchase failed:", error);
    return NextResponse.json(
      { error: "Unable to record the purchase." },
      { status: 500 },
    );
  }
}
