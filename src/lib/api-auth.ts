import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/auth-core";
import { getSession } from "@/lib/session";
import { isSameOrigin } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * Authenticate an API request from the session cookie and block cross-site
 * (CSRF) calls on mutating endpoints. Always derive `storeId` from the session
 * here — never trust a store id sent by the client.
 *
 * The token is re-validated against the database on every call so that a
 * revoked session (bumped sessionVersion), a deactivated user, or a suspended
 * store is rejected immediately even if the HMAC token itself is unchanged.
 */
export type AuthedSession = { session: SessionPayload };

export async function requireSession(
  request?: Request,
): Promise<AuthedSession | NextResponse> {
  if (request && !isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Rejected cross-site request." },
      { status: 403 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const user = await prisma.user
    .findUnique({
      where: { id: session.userId },
      select: {
        active: true,
        sessionVersion: true,
        storeId: true,
        store: { select: { status: true } },
      },
    })
    .catch(() => null);

  if (!user || !user.active || !user.store) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (
    user.sessionVersion !== session.sessionVersion ||
    user.storeId !== session.storeId ||
    user.store.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      { error: "Your session is no longer valid." },
      { status: 401 },
    );
  }

  return { session };
}

export async function requireOwner(
  request?: Request,
): Promise<AuthedSession | NextResponse> {
  const result = await requireSession(request);
  if (result instanceof NextResponse) return result;
  if (result.session.role !== "OWNER" && result.session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only the store owner can do that." },
      { status: 403 },
    );
  }
  return result;
}
