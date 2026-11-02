import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-auth";

const adjustSchema = z.object({
  productId: z.string().min(1),
  // Signed delta in base units: positive restocks, negative writes off.
  quantityBase: z
    .number()
    .int()
    .refine((value) => value !== 0, "Enter an amount to add or remove."),
  note: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid adjustment." },
      { status: 400 },
    );
  }

  const { productId, quantityBase, note } = parsed.data;
  const storeId = auth.session.storeId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, storeId },
      });
      if (!product) throw new Error("Product not found.");

      const next = product.stockBaseUnits + quantityBase;
      if (next < 0) {
        throw new Error("That would leave a negative stock count.");
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockBaseUnits: next },
      });

      await tx.inventoryMovement.create({
        data: {
          storeId,
          productId,
          userId: auth.session.userId,
          kind: "ADJUSTMENT",
          quantityBase,
          note: note ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ product: result });
  } catch (error) {
    if (error instanceof Error && /not found|negative/i.test(error.message)) {
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
    console.error("Stock adjustment failed:", error);
    return NextResponse.json(
      { error: "Unable to adjust the stock." },
      { status: 500 },
    );
  }
}
