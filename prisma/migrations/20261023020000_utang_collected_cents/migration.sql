-- Amount already collected against a credit (utang) sale.
ALTER TABLE "Sale" ADD COLUMN "collectedCents" INTEGER NOT NULL DEFAULT 0;

-- Index superseded by the reporting indexes; keep the database in sync with
-- the Prisma schema.
DROP INDEX IF EXISTS "Sale_storeId_paymentMethod_utangStatus_idx";
