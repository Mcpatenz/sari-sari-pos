import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireSession } from "@/lib/api-auth";

const STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  address: true,
  phone: true,
  photoUrl: true,
  gcashQrDataUrl: true,
  businessOpenTime: true,
  businessCloseTime: true,
  status: true,
} as const;

const storeTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 08:00.")
  .or(z.literal(""))
  .nullable()
  .optional();

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  photoUrl: z
    .string()
    .max(2_000_000)
    .refine(
      (value) => /^data:image\/(png|jpe?g|webp);base64,/.test(value),
      "Upload a PNG or JPG image.",
    )
    .nullable()
    .optional(),
  businessOpenTime: storeTime,
  businessCloseTime: storeTime,
  gcashQrDataUrl: z
    .string()
    .max(2_000_000)
    .refine(
      (value) => /^data:image\/(png|jpe?g|webp);base64,/.test(value),
      "Upload a PNG or JPG image.",
    )
    .nullable()
    .optional(),
});

export async function GET() {
  await connection();

  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const store = await prisma.store.findUnique({
    where: { id: auth.session.storeId },
    select: STORE_SELECT,
  });
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PUT(request: Request) {
  await connection();

  const auth = await requireOwner(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid store details." },
      { status: 400 },
    );
  }

  const { name, address, phone, photoUrl, gcashQrDataUrl, businessOpenTime, businessCloseTime } = parsed.data;

  try {
    const store = await prisma.store.update({
      where: { id: auth.session.storeId },
      data: {
        name,
        address: address === undefined ? undefined : address || null,
        phone: phone === undefined ? undefined : phone || null,
        photoUrl: photoUrl === undefined ? undefined : photoUrl || null,
        businessOpenTime: businessOpenTime === undefined ? undefined : businessOpenTime || null,
        businessCloseTime: businessCloseTime === undefined ? undefined : businessCloseTime || null,
        gcashQrDataUrl:
          gcashQrDataUrl === undefined ? undefined : gcashQrDataUrl || null,
      },
      select: STORE_SELECT,
    });
    return NextResponse.json({ store });
  } catch (error) {
    console.error("PUT store failed:", error);
    return NextResponse.json(
      { error: "Unable to save the store details." },
      { status: 500 },
    );
  }
}
