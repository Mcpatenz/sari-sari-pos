-- Track whether a credit sale has been collected.
CREATE TYPE "UtangStatus" AS ENUM ('PENDING', 'PAID');

ALTER TABLE "Sale" ADD COLUMN "utangStatus" "UtangStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Sale" ADD COLUMN "collectedAt" TIMESTAMP(3);

CREATE INDEX "Sale_storeId_paymentMethod_utangStatus_idx" ON "Sale"("storeId", "paymentMethod", "utangStatus");
