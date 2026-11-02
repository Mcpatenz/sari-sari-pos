import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  products: number;
  lowStock: number;
  users: number;
  todaySalesCents: number;
  todaySalesCount: number;
  totalSalesCents: number;
  totalSalesCount: number;
  utangOutstandingCents: number;
  utangOpenCount: number;
};

// "Today" means today in the sari-sari store's own time zone (Asia/Manila,
// UTC+8), not the server's UTC clock.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function startOfManilaDay(): Date {
  const manila = new Date(Date.now() + MANILA_OFFSET_MS);
  manila.setUTCHours(0, 0, 0, 0);
  return new Date(manila.getTime() - MANILA_OFFSET_MS);
}

/**
 * Aggregate the numbers shown on the owner dashboard, always scoped to a single
 * store. Only COMPLETED sales count toward revenue so voided/returned sales do
 * not inflate the totals.
 */
export async function getDashboardStats(
  storeId: string,
): Promise<DashboardStats> {
  const startOfDay = startOfManilaDay();

  const [products, users, todayAgg, totalAgg, utangAgg] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      select: { active: true, stockBaseUnits: true, lowStockAt: true },
    }),
    prisma.user.count({ where: { storeId, active: true } }),
    prisma.sale.aggregate({
      where: { storeId, status: "COMPLETED", createdAt: { gte: startOfDay } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: { storeId, status: "COMPLETED" },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: {
        storeId,
        status: "COMPLETED",
        paymentMethod: "UTANG",
        utangStatus: "PENDING",
      },
      _sum: { totalCents: true, collectedCents: true },
      _count: { _all: true },
    }),
  ]);

  const activeProducts = products.filter((product) => product.active);
  const lowStock = activeProducts.filter(
    (product) => product.lowStockAt > 0 && product.stockBaseUnits <= product.lowStockAt,
  ).length;

  return {
    products: activeProducts.length,
    lowStock,
    users,
    todaySalesCents: todayAgg._sum.totalCents ?? 0,
    todaySalesCount: todayAgg._count._all,
    totalSalesCents: totalAgg._sum.totalCents ?? 0,
    totalSalesCount: totalAgg._count._all,
    utangOutstandingCents: Math.max(
      0,
      (utangAgg._sum.totalCents ?? 0) - (utangAgg._sum.collectedCents ?? 0),
    ),
    utangOpenCount: utangAgg._count._all,
  };
}
