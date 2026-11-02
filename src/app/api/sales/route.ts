import { NextResponse, connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { priceForQuantity, type ProductKind, type SellingUnit } from "@/lib/pricing";

const saleSchema = z.object({
  idempotencyKey: z.string().min(8).max(120),
  deviceId: z.string().max(120).optional(),
  discountCents: z.number().int().nonnegative().default(0),
  cashReceivedCents: z.number().int().nonnegative(),
  paymentMethod: z.enum(["CASH", "GCASH", "UTANG"]).default("CASH"),
  customerId: z.string().min(1).optional(),
  note: z.string().max(240).optional(),
  referenceNumber: z.string().trim().max(60).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityBase: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(200),
});

function parseUnits(value: Prisma.JsonValue): SellingUnit[] {
  if (!Array.isArray(value)) return [];
  return value as unknown as SellingUnit[];
}

export async function POST(request: Request) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const parsed = saleSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid sale data.",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const {
    idempotencyKey,
    deviceId,
    discountCents,
    cashReceivedCents,
    paymentMethod,
    customerId,
    note,
    referenceNumber,
    items,
  } = parsed.data;

  if (paymentMethod === "UTANG" && !customerId) {
    return NextResponse.json({ error: "Customer is required for utang." }, { status: 400 });
  }
  const quantities = new Map<string, number>();
  for (const item of items) {
    const next = (quantities.get(item.productId) ?? 0) + item.quantityBase;
    if (!Number.isSafeInteger(next)) {
      return NextResponse.json({ error: "Quantity is too large." }, { status: 400 });
    }
    quantities.set(item.productId, next);
  }

  try {
    const storeId = session.session.storeId;

    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.sale.findUnique({
          where: { storeId_idempotencyKey: { storeId: storeId, idempotencyKey } },
          include: { items: true },
        });
        if (existing) return { sale: existing, repeated: true };

        const productIds = [...quantities.keys()];
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, storeId: storeId, active: true },
        });

        if (products.length !== productIds.length) {
          throw new Error("A product in this sale is no longer available.");
        }

        const lines = products.map((product) => {
          const quantityBase = quantities.get(product.id) as number;

          if (product.stockBaseUnits < quantityBase) {
            throw new Error(`Insufficient stock for ${product.name}.`);
          }

          const lineTotalCents = priceForQuantity(
            {
              kind: product.kind as ProductKind,
              basePriceCents: product.basePriceCents,
              units: parseUnits(product.units),
            },
            quantityBase,
          );

          return { product, quantityBase, lineTotalCents };
        });

        const grossCents = lines.reduce(
          (sum, line) => sum + line.lineTotalCents,
          0,
        );
        const totalCents = Math.max(0, grossCents - discountCents);

        if (!Number.isSafeInteger(totalCents)) {
          throw new Error("Sale total is invalid.");
        }
        if (paymentMethod !== "UTANG" && cashReceivedCents < totalCents) {
          throw new Error("Cash received is less than the sale total.");
        }

        const sale = await tx.sale.create({
          data: {
            storeId: storeId,
            deviceId: deviceId ?? null,
            receiptNumber: `SS-${Date.now().toString(36).toUpperCase()}`,
            idempotencyKey,
            totalCents,
            discountCents,
            cashReceivedCents: paymentMethod === "UTANG" ? 0 : cashReceivedCents,
            changeCents: paymentMethod === "UTANG" ? 0 : (cashReceivedCents - totalCents),
            paymentMethod,
            cashierId: session.session.userId,
            customerId: customerId ?? null,
            note: note ?? null,
            referenceNumber: referenceNumber ?? null,
            syncedAt: new Date(),
            items: {
              create: lines.map((line) => ({
                productId: line.product.id,
                sku: line.product.sku,
                productName: line.product.name,
                kind: line.product.kind,
                quantityBase: line.quantityBase,
                lineTotalCents: line.lineTotalCents,
              })),
            },
          },
          include: { items: true },
        });

        for (const line of lines) {
          const updated = await tx.product.updateMany({
            where: {
              id: line.product.id,
              storeId: storeId,
              active: true,
              stockBaseUnits: { gte: line.quantityBase },
            },
            data: { stockBaseUnits: { decrement: line.quantityBase } },
          });

          if (updated.count !== 1) {
            throw new Error(`Stock changed for ${line.product.name}. Please retry.`);
          }
        }

        return { sale, repeated: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json(result, { status: result.repeated ? 200 : 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      /insufficient stock|no longer available|cash received|stock changed/i.test(
        error.message,
      )
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return NextResponse.json(
        { error: "A concurrent sale used the same key. Retry the sync." },
        { status: 409 },
      );
    }

    console.error("Checkout API failed:", error);
    return NextResponse.json(
      { error: "Unable to complete the sale." },
      { status: 500 },
    );
  }
}
