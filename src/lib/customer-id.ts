import { prisma } from "@/lib/prisma";

/**
 * Customer ids combine the day the customer was added with a running sequence
 * for that store, so the id reads as a sortable date plus a daily count:
 * "20261016001" is the first customer added on 16 Oct 2026.
 */

/** Local date stamp, "YYYYMMDD". */
export function customerDateStamp(at: Date = new Date()): string {
  const yyyy = at.getFullYear().toString();
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export function formatCustomerId(stamp: string, sequence: number): string {
  return `${stamp}${String(sequence).padStart(3, "0")}`;
}

/** The next free id for this store: today's stamp plus one past today's count. */
export async function nextCustomerId(storeId: string, at: Date = new Date()): Promise<string> {
  const stamp = customerDateStamp(at);
  const used = await prisma.customer.count({
    where: { storeId, customerId: { startsWith: stamp } },
  });
  return formatCustomerId(stamp, used + 1);
}

/** True for a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && (error as { code?: unknown }).code === "P2002";
}
