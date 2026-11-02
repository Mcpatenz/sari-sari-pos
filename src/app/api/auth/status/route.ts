import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();

  try {
    const [storeCount, userCount] = await Promise.all([
      prisma.store.count(),
      prisma.user.count(),
    ]);
    return NextResponse.json({
      databaseReady: true,
      needsSetup: storeCount === 0,
      hasStores: storeCount > 0,
      hasUsers: userCount > 0,
    });
  } catch (error) {
    console.error("Auth status failed:", error);
    // Stay 200 so the sign-in screen can explain the state instead of showing
    // a generic network failure. No account data is exposed.
    return NextResponse.json({
      databaseReady: false,
      needsSetup: false,
      hasStores: false,
      hasUsers: false,
    });
  }
}