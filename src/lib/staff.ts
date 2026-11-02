import { z } from "zod";

/** Shared field schemas for staff profile data (used by /api/users and /api/profile). */

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const dateOnly = z
  .string()
  .regex(DATE_ONLY, "Use a valid date.")
  .nullable()
  .optional();

export const imageDataUrl = z
  .string()
  .max(2_000_000)
  .refine(
    (value) => value === "" || /^data:image\/(png|jpe?g|webp);base64,/.test(value),
    "Upload a PNG or JPG image.",
  )
  .nullable()
  .optional();

export const gender = z.string().trim().max(20).nullable().optional();
export const civilStatus = z.string().trim().max(20).nullable().optional();
export const address = z.string().trim().max(200).nullable().optional();
export const contactNumber = z.string().trim().max(40).nullable().optional();

/** Convert a `YYYY-MM-DD` form value into a Date at local midnight. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}
