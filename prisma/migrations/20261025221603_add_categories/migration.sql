-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_name_key" ON "Category"("storeId", "name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed categories from existing products so owners see their current categories.
INSERT INTO "Category" ("id", "storeId", "name", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "storeId", "category", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product"
WHERE btrim("category") <> ''
GROUP BY "storeId", "category"
ON CONFLICT ("storeId", "name") DO NOTHING;
