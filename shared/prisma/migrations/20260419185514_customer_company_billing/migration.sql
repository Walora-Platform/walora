/*
  Warnings:

  - You are about to drop the column `invoicePeriodInDays` on the `CustomerCompany` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('NONE', 'MONTHLY_DAY', 'MONTH_END', 'AFTER_EACH');

-- CreateEnum
CREATE TYPE "BillingBatchStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterTable
ALTER TABLE "CustomerCompany" DROP COLUMN "invoicePeriodInDays",
ADD COLUMN     "billingDayOfMonth" INTEGER,
ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "billingItemId" TEXT;

-- CreateTable
CREATE TABLE "BillingBatch" (
    "id" TEXT NOT NULL,
    "customerCompanyId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "BillingBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "BillingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingItem" (
    "id" TEXT NOT NULL,
    "billingBatchId" TEXT NOT NULL,
    "totalPallets" INTEGER NOT NULL,
    "tariffPrice" DECIMAL(65,30),
    "finalPrice" DECIMAL(65,30),

    CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingBatch_customerCompanyId_idx" ON "BillingBatch"("customerCompanyId");

-- CreateIndex
CREATE INDEX "Parcel_billingItemId_idx" ON "Parcel"("billingItemId");

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_billingBatchId_fkey" FOREIGN KEY ("billingBatchId") REFERENCES "BillingBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_billingItemId_fkey" FOREIGN KEY ("billingItemId") REFERENCES "BillingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
