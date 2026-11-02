import { prisma } from "@/lib/prisma";

export async function getDefaultStore() {
  const existing = await prisma.store.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  return prisma.store.create({
    data: {
      name: "My Sari-Sari Store",
    },
  });
}
