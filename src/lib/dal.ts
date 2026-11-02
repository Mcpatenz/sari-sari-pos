import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * Data Access Layer: verifies the session and resolves the current user.
 * React's `cache` dedupes the work within a single render pass.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      storeId: true,
      name: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
      store: {
        select: {
          id: true,
          name: true,
          status: true,
          slug: true,
          address: true,
          phone: true,
        },
      },
    },
  });

  if (!user || !user.active) return null;
  // A bumped session version invalidates this token server-side too.
  if (user.sessionVersion !== session.sessionVersion) return null;
  if (user.store.status !== "ACTIVE") return null;
  return user;
});