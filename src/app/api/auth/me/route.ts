import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  await connection();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const store = await prisma.store
    .findUnique({
      where: { id: session.storeId },
      select: {
        name: true,
        slug: true,
        status: true,
        address: true,
        phone: true,
        gcashQrDataUrl: true,
      },
    })
    .catch(() => null);

  if (store && store.status !== "ACTIVE") {
    return NextResponse.json({ user: null }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      storeId: session.storeId,
      name: session.name,
      email: session.email,
      role: session.role,
      storeName: store?.name ?? null,
      storeSlug: store?.slug ?? null,
      storeAddress: store?.address ?? null,
      storePhone: store?.phone ?? null,
      storeGcashQr: store?.gcashQrDataUrl ?? null,
    },
  });
}
