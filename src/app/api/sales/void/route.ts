import { NextResponse, connection } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

const voidSchema = z.object({
  saleId: z.string().min(1),
  action: z.enum(["VOID", "RETURN"]),
  note: z.string().trim().max(240).optional(),
});

export async function POST(request: Request) {
  await connection();

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = voidSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { saleId, action, note } = parsed.data;
  const storeId = auth.session.storeId;
  const nextStatus = action === "VOID" ? "VOIDED" : "RETURNED";

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.sale.findFirst({
          where: { id: saleId, storeId },
          include: { items: true },
        });
        if (!existing) throw new Error("Sale not found.");
        if (existing.status !== "COMPLETED") {
          throw new Error("This sale was already voided or returned.");
        }

        // Put the sold quantities back on the shelf.
        for (const item of existing.items) {
          if (!item.productId) continue;
          const restored = await tx.product.updateMany({
            where: { id: item.productId, storeId },
            data: { stockBaseUnits: { increment: item.quantityBase } },
          });
          if (restored.count !== 1) continue;

          await tx.inventoryMovement.create({
            data: {
              storeId,
              productId: item.productId,
              userId: auth.session.userId,
              kind: action === "VOID" ? "VOID" : "RETURN",
              quantityBase: item.quantityBase,
              note: note ?? null,
            },
          });
        }

        return tx.sale.update({
          where: { id: saleId },
          data: { status: nextStatus, note: note ?? existing.note },
          include: { items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ sale });
  } catch (error) {
    if (error instanceof Error && /not found|already/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "The sale changed at the same time. Please retry." },
        { status: 409 },
      );
    }
    console.error("Void/return failed:", error);
    return NextResponse.json(
      { error: "Unable to void or return the sale." },
      { status: 500 },
    );
  }
}
