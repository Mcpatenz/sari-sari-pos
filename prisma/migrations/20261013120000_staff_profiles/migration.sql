-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "employeeId" TEXT,
    ADD COLUMN "address" TEXT,
    ADD COLUMN "birthdate" TIMESTAMP(3),
    ADD COLUMN "gender" TEXT,
    ADD COLUMN "civilStatus" TEXT,
    ADD COLUMN "contactNumber" TEXT,
    ADD COLUMN "dateHired" TIMESTAMP(3),
    ADD COLUMN "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_storeId_employeeId_key" ON "User"("storeId", "employeeId");
