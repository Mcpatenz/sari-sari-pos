import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { requireOwner, requireSession } from "@/lib/api-auth";

const unitSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(40),
  quantityBase: z.number().int().positive(),
  priceCents: z.number().int().nonnegative().nullable(),
});

const productSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(60).nullable().optional(),
  name: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(80).default("General"),
  kind: z.enum(["PIECE", "WEIGHT", "VOLUME"]),
  basePriceCents: z.number().int().positive(),
  stockBaseUnits: z.number().int().nonnegative(),
  costPerBaseCents: z.number().int().nonnegative().default(0),
  lowStockAt: z.number().int().nonnegative().default(0),
  units: z.array(unitSchema).max(50).default([]),
  active: z.boolean().default(true),
});

function errorDetails(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

export async function GET() {
  await connection();

  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const products = await prisma.product.findMany({
      where: { storeId: session.session.storeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET products failed:", error);
    return NextResponse.json(
      { error: "Unable to load products." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await connection();

  const session = await requireOwner(request);
  if (session instanceof NextResponse) return session;

  const parsed = productSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product data.", details: errorDetails(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // A preset can never cost more than the same amount at base price.
  const oversell = data.units.find(
    (unit) =>
      unit.priceCents !== null &&
      (data.kind === "PIECE"
        ? unit.priceCents > unit.quantityBase * data.basePriceCents
        : unit.priceCents >
          Math.round((unit.quantityBase * data.basePriceCents) / 1000)),
  );

  if (oversell) {
    return NextResponse.json(
      { error: `Preset "${oversell.label}" is priced above the base rate.` },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        storeId: session.session.storeId,
        sku: data.sku,
        barcode: data.barcode ?? null,
        name: data.name,
        category: data.category,
        kind: data.kind,
        basePriceCents: data.basePriceCents,
        stockBaseUnits: data.stockBaseUnits,
        costPerBaseCents: data.costPerBaseCents,
        lowStockAt: data.lowStockAt,
        units: data.units,
        active: data.active,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This SKU already exists in the store." },
        { status: 409 },
      );
    }

    console.error("POST product failed:", error);
    return NextResponse.json(
      { error: "Unable to save the product." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await connection();

  const session = await requireOwner(request);
  if (session instanceof NextResponse) return session;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const existing = await prisma.product.findFirst({
    where: { id, storeId: session.session.storeId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // Archive rather than delete: sales history keeps referencing the product.
  const product = await prisma.product.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ product });
}

export async function PUT(request: Request) {
  await connection();

  const session = await requireOwner(request);
  if (session instanceof NextResponse) return session;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product.", details: errorDetails(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id, storeId: session.session.storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This SKU already exists in the store." },
        { status: 409 },
      );
    }

    console.error("PUT product failed:", error);
    return NextResponse.json(
      { error: "Unable to save the product." },
      { status: 500 },
    );
  }
}
