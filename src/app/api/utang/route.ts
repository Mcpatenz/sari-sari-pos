import { NextResponse, connection } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { formatPHP } from "@/lib/format";
import { z } from "zod";

const collectSchema = z.object({
  saleId: z.string().min(1),
  amountCents: z.number().int().positive(),
});

export async function POST(request: Request) {
  await connection();
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const parsed = collectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid collection request." }, { status: 400 });

  // One transaction keeps a double-tap or two devices from collecting the same
  // balance twice: the update only lands if collectedCents is unchanged.
  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: {
        id: parsed.data.saleId,
        storeId: session.session.storeId,
        paymentMethod: "UTANG",
        status: "COMPLETED",
        utangStatus: "PENDING",
      },
      select: { id: true, totalCents: true, collectedCents: true },
    });

    if (!sale) {
      return { error: "This utang is already paid or no longer exists.", status: 409 };
    }

    const remainingCents = sale.totalCents - sale.collectedCents;
    if (parsed.data.amountCents > remainingCents) {
      return {
        error: `Amount cannot exceed the remaining balance of ${formatPHP(remainingCents)}.`,
        status: 400,
      };
    }

    const nextCollectedCents = sale.collectedCents + parsed.data.amountCents;
    const paid = nextCollectedCents >= sale.totalCents;

    const updated = await tx.sale.updateMany({
      where: {
        id: sale.id,
        collectedCents: sale.collectedCents,
        utangStatus: "PENDING",
      },
      data: {
        collectedCents: nextCollectedCents,
        utangStatus: paid ? "PAID" : "PENDING",
        collectedAt: paid ? new Date() : null,
      },
    });

    if (updated.count === 0) {
      return {
        error: "This utang changed on another device. Refresh and try again.",
        status: 409,
      };
    }

    return { paid, remainingCents: sale.totalCents - nextCollectedCents };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    paid: result.paid,
    remainingCents: result.remainingCents,
  });
}

export async function GET(request: Request) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "10", 10));
  const cashierId = searchParams.get("cashierId")?.trim() ?? null;
  const status = searchParams.get("status") === "PAID" ? "PAID" : "PENDING";

  const where: Prisma.SaleWhereInput = {
    storeId: session.session.storeId,
    paymentMethod: "UTANG",
    status: "COMPLETED",
    utangStatus: status,
  };

  // If not owner, only show their own utang? But cashier dashboard needs "display utang for specific cashier" - and cashier is viewing their own
  if (session.session.role !== "OWNER" && session.session.role !== "SUPER_ADMIN") {
    where.cashierId = session.session.userId;
  } else if (cashierId) {
    where.cashierId = cashierId;
  }

  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { customerId: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, sums, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where,
      _sum: { totalCents: true, collectedCents: true },
    }),
    prisma.sale.findMany({
      where,
      include: {
        customer: true,
        cashier: { select: { id: true, name: true, employeeId: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalCents = sums._sum.totalCents ?? 0;
  const collectedCents = sums._sum.collectedCents ?? 0;

  return NextResponse.json({
    sales,
    total,
    page,
    limit,
    summary: {
      totalCents,
      collectedCents,
      outstandingCents: Math.max(0, totalCents - collectedCents),
    },
  });
}
