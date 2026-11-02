import { NextResponse, connection } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { nextCustomerId } from "@/lib/customer-id";

/** The id the next customer created by this store will receive. */
export async function GET(request: Request) {
  await connection();

  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const customerId = await nextCustomerId(session.session.storeId);

  return NextResponse.json({ customerId });
}
