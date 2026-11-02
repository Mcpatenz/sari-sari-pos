import { NextResponse, connection } from "next/server";
import { requireSession } from "@/lib/api-auth";

export async function GET(request: Request) {
  await connection();
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ ok: true });
}
