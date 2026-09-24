-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('RECEIVED', 'PLANNED', 'LOADED', 'DELIVERED', 'CLOSED');

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "note" TEXT,
ADD COLUMN     "problem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ParcelStatus" NOT NULL DEFAULT 'RECEIVED';

-- CreateIndex
CREATE INDEX "Parcel_customerId_idx" ON "Parcel"("customerId");

-- CreateIndex
CREATE INDEX "Parcel_createdAt_idx" ON "Parcel"("createdAt");

-- CreateIndex
CREATE INDEX "Parcel_pickupDate_idx" ON "Parcel"("pickupDate");

-- CreateIndex
CREATE INDEX "Parcel_deliveryDate_idx" ON "Parcel"("deliveryDate");

-- CreateIndex
CREATE INDEX "Parcel_ladingDocumentNum_idx" ON "Parcel"("ladingDocumentNum");

-- CreateIndex
CREATE INDEX "Parcel_reference_idx" ON "Parcel"("reference");

-- CreateIndex
CREATE INDEX "Parcel_deliveryCity_idx" ON "Parcel"("deliveryCity");

-- CreateIndex
CREATE INDEX "Parcel_deliveryName_idx" ON "Parcel"("deliveryName");

-- CreateIndex
CREATE INDEX "Parcel_problem_idx" ON "Parcel"("problem");
