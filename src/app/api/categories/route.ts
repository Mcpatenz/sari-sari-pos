import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireSession } from "@/lib/api-auth";

const FALLBACK_CATEGORY = "General";
const RESERVED_CATEGORY = "all";

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const nameSchema = z.object({
  name: z.string().transform(normalizeName).pipe(z.string().min(1).max(80)),
});

const renameSchema = z.object({
  name: z.string().transform(normalizeName).pipe(z.string().min(1).max(80)),
  newName: z.string().transform(normalizeName).pipe(z.string().min(1).max(80)),
});

function isReserved(name: string): boolean {
  return name.toLowerCase() === RESERVED_CATEGORY;
}

function invalid(message = "Enter a category name.") {
  return NextResponse.json({ error: message }, { status: 400 });
}

type CategoryRow = { id: string; name: string; createdAt: Date; updatedAt: Date };

function toResponse(row: CategoryRow, productCount: number) {
  return {
    id: row.id,
    name: row.name,
    productCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  await connection();

  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const { storeId } = auth.session;

  const [rows, grouped] = await Promise.all([
    prisma.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
    }),
    prisma.product.groupBy({
      by: ["category"],
      where: { storeId },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const group of grouped) {
    const key = group.category.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + group._count._all);
  }

  const merged = new Map<string, ReturnType<typeof toResponse>>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    merged.set(key, toResponse(row, counts.get(key) ?? 0));
  }

  // Include category names that already exist on products but predate the
  // category table, so the owner can rename or clean them up too.
  for (const group of grouped) {
    const name = group.category.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (merged.has(key)) continue;
    merged.set(key, {
      id: "",
      name,
      productCount: counts.get(key) ?? 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
  }

  const fallbackKey = FALLBACK_CATEGORY.toLowerCase();
  if (!merged.has(fallbackKey)) {
    merged.set(fallbackKey, {
      id: "",
      name: FALLBACK_CATEGORY,
      productCount: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
  }

  const categories = [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = nameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  if (isReserved(parsed.data.name)) return invalid('"All" is a reserved filter name.');

  const { storeId } = auth.session;
  const { name } = parsed.data;

  const [existing, productMatch] = await Promise.all([
    prisma.category.findFirst({
      where: {
        storeId,
        name: { equals: name, mode: "insensitive" },
      },
    }),
    prisma.product.findFirst({
      where: {
        storeId,
        category: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    }),
  ]);
  if (existing || productMatch) {
    return NextResponse.json(
      { error: "That category already exists." },
      { status: 409 },
    );
  }

  try {
    const category = await prisma.category.create({
      data: { storeId, name },
    });
    return NextResponse.json({ category: toResponse(category, 0) }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That category already exists." },
        { status: 409 },
      );
    }
    console.error("POST category failed:", error);
    return NextResponse.json(
      { error: "Unable to save the category." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);

  const { storeId } = auth.session;
  const { name, newName } = parsed.data;

  if (isReserved(name) || isReserved(newName)) {
    return invalid('"All" is a reserved filter name.');
  }

  const categories = await prisma.category.findMany({
    where: { storeId },
    select: { id: true, name: true },
  });
  const oldRow = categories.find(
    (row) => row.name.toLowerCase() === name.toLowerCase(),
  );
  const destination = categories.find(
    (row) => row.name.toLowerCase() === newName.toLowerCase(),
  );

  if (!oldRow && destination) {
    return NextResponse.json(
      { error: "That category already exists." },
      { status: 409 },
    );
  }

  if (destination && destination.id !== oldRow?.id) {
    return NextResponse.json(
      { error: "A category with that name already exists." },
      { status: 409 },
    );
  }

  if (name === newName) {
    return NextResponse.json({ category: null, movedProducts: 0 });
  }

  try {
    // A case-only rename must not go through the upsert/delete pair below:
    // a case-insensitive delete would also remove the freshly renamed row.
    if (newName.toLowerCase() === name.toLowerCase()) {
      const [updated] = await prisma.$transaction([
        prisma.product.updateMany({
          where: {
            storeId,
            category: { equals: name, mode: "insensitive" },
          },
          data: { category: newName },
        }),
        oldRow
          ? prisma.category.update({
              where: { id: oldRow.id },
              data: { name: newName },
            })
          : prisma.category.create({ data: { storeId, name: newName } }),
      ]);

      const category = await prisma.category.findFirst({
        where: {
          storeId,
          name: { equals: newName, mode: "insensitive" },
        },
      });

      return NextResponse.json({
        category: category ? toResponse(category, updated.count) : null,
        movedProducts: updated.count,
      });
    }

    const [updated] = await prisma.$transaction([
      prisma.product.updateMany({
        where: {
          storeId,
          category: { equals: name, mode: "insensitive" },
        },
        data: { category: newName },
      }),
      prisma.category.upsert({
        where: { storeId_name: { storeId, name: newName } },
        update: {},
        create: { storeId, name: newName },
      }),
      prisma.category.deleteMany({
        where: {
          storeId,
          name: { equals: name, mode: "insensitive" },
        },
      }),
    ]);

    const category = await prisma.category.findUnique({
      where: { storeId_name: { storeId, name: newName } },
    });

    return NextResponse.json({
      category: category ? toResponse(category, updated.count) : null,
      movedProducts: updated.count,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A category with that name already exists." },
        { status: 409 },
      );
    }
    console.error("PUT category failed:", error);
    return NextResponse.json(
      { error: "Unable to update the category." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = nameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);

  const { storeId } = auth.session;
  const { name } = parsed.data;

  if (name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()) {
    return invalid(`${FALLBACK_CATEGORY} is the fallback category and cannot be deleted.`);
  }

  const [category, productCount] = await Promise.all([
    prisma.category.findFirst({
      where: { storeId, name: { equals: name, mode: "insensitive" } },
    }),
    prisma.product.count({
      where: { storeId, category: { equals: name, mode: "insensitive" } },
    }),
  ]);

  if (!category && productCount === 0) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.category.upsert({
        where: { storeId_name: { storeId, name: FALLBACK_CATEGORY } },
        update: {},
        create: { storeId, name: FALLBACK_CATEGORY },
      }),
      prisma.product.updateMany({
        where: {
          storeId,
          category: { equals: name, mode: "insensitive" },
        },
        data: { category: FALLBACK_CATEGORY },
      }),
      prisma.category.deleteMany({
        where: {
          storeId,
          name: { equals: name, mode: "insensitive" },
        },
      }),
    ]);

    return NextResponse.json({ movedProducts: productCount });
  } catch (error) {
    console.error("DELETE category failed:", error);
    return NextResponse.json(
      { error: "Unable to delete the category." },
      { status: 500 },
    );
  }
}
