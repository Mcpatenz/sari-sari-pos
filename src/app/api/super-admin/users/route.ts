import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-core";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin(request: Request) {
  const result = await requireSession(request);
  if (result instanceof NextResponse) return result;
  if (result.session.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super admin access required." }, { status: 403 });
  return result;
}

const userSelect = { id: true, storeId: true, name: true, email: true, role: true, active: true, createdAt: true, store: { select: { name: true } } } as const;

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !email || password.length < 8 || typeof body?.storeId !== "string") return NextResponse.json({ error: "Name, email, store, and an 8-character password are required." }, { status: 400 });
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash: hashPassword(password), storeId: body.storeId, role: body.role === "OWNER" ? "OWNER" : "CASHIER" }, select: userSelect });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email may already be registered or the store is invalid." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "User id is required." }, { status: 400 });
  const data = {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined,
    storeId: typeof body.storeId === "string" ? body.storeId : undefined,
    role: body.role === "OWNER" || body.role === "CASHIER" || body.role === "SUPER_ADMIN" ? body.role : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    ...(typeof body.password === "string" && body.password.length >= 8 ? { passwordHash: hashPassword(body.password), sessionVersion: { increment: 1 } } : {}),
  };
  try {
    const user = await prisma.user.update({ where: { id: body.id }, data, select: userSelect });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Unable to update user." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (body?.id === auth.session.userId) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  if (typeof body?.id !== "string") return NextResponse.json({ error: "User id is required." }, { status: 400 });
  try {
    await prisma.user.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete user." }, { status: 400 });
  }
}
