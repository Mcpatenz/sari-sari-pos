import { NextResponse } from "next/server";
import { connection } from "next/server";
import { endSession } from "@/lib/session";
import { isSameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  await connection();

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Rejected cross-site request." },
      { status: 403 },
    );
  }

  await endSession();
  return NextResponse.json({ ok: true });
}
