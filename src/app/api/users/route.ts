import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth-core";
import {
  PASSWORD_MAX_LENGTH,
  passwordProblems,
} from "@/lib/password-policy";
import { nextEmployeeId } from "@/lib/employee-id";
import {
  contactNumber as contactNumberField,
  dateOnly,
  parseDateOnly,
} from "@/lib/staff";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  employeeId: true,
  contactNumber: true,
  dateHired: true,
  photoUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  role: z.enum(["OWNER", "CASHIER"]).default("CASHIER"),
  contactNumber: contactNumberField,
  dateHired: dateOnly,
  photoUrl: z.string().max(2_000_000).nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["OWNER", "CASHIER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH).optional(),
  contactNumber: contactNumberField,
  dateHired: dateOnly,
  photoUrl: z.string().max(2_000_000).nullable().optional(),
});

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function GET() {
  await connection();

  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    where: { storeId: auth.session.storeId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: USER_SELECT,
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid account details." },
      { status: 400 },
    );
  }

  const { name, role, password, contactNumber, dateHired, photoUrl } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const problems = passwordProblems(password);
  if (problems.length > 0) {
    return NextResponse.json(
      { error: `Password too weak for a cashier. ${problems.join("; ")}.` },
      { status: 400 },
    );
  }

  const storeId = auth.session.storeId;
  const passwordHash = hashPassword(password);

  // Generate the employee id from the family name, then retry a couple of times
  // in the unlikely event two accounts race for the same sequence number.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await prisma.user.findMany({
      where: { storeId },
      select: { employeeId: true },
    });
    const employeeId = nextEmployeeId(
      existing.map((row) => row.employeeId),
      name,
    );

    try {
      const user = await prisma.user.create({
        data: {
          storeId,
          name,
          email,
          role,
          active: true,
          passwordHash,
          sessionVersion: 0,
          employeeId,
          contactNumber: contactNumber || null,
          dateHired: parseDateOnly(dateHired),
          photoUrl: photoUrl || null,
        },
        select: USER_SELECT,
      });
      return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const target = (error as { meta?: { target?: unknown } }).meta?.target;
        if (Array.isArray(target) && target.includes("employeeId")) continue;
        return NextResponse.json(
          { error: "That email is already used by another account." },
          { status: 409 },
        );
      }
      console.error("POST user failed:", error);
      return NextResponse.json(
        { error: "Unable to create the account." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Unable to allocate an employee id. Please try again." },
    { status: 409 },
  );
}

export async function PUT(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing account id." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid changes." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: { id, storeId: auth.session.storeId },
    select: { id: true, role: true, active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const { name, role, active, password, contactNumber, dateHired } = parsed.data;

  if (password !== undefined) {
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `Password too weak. ${problems.join("; ")}.` },
        { status: 400 },
      );
    }
  }

  const isSelf = id === auth.session.userId;

  // An owner must never be able to lock themselves out of their own store.
  if (isSelf && role && role !== "OWNER") {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 },
    );
  }
  if (isSelf && active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 },
    );
  }

  // Any of these changes must revoke the target's existing sessions.
  const mustRevoke =
    password !== undefined ||
    active === false ||
    (role !== undefined && role !== existing.role);

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(password !== undefined ? { passwordHash: hashPassword(password) } : {}),
        ...(contactNumber !== undefined
          ? { contactNumber: contactNumber || null }
          : {}),
        ...(dateHired !== undefined ? { dateHired: parseDateOnly(dateHired) } : {}),
        ...(mustRevoke ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: USER_SELECT,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("PUT user failed:", error);
    return NextResponse.json(
      { error: "Unable to update the account." },
      { status: 500 },
    );
  }
}
