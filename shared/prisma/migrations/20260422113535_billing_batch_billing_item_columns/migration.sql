/*
  Warnings:

  - Added the required column `deliveryPsc` to the `BillingItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `tariffPrice` on table `BillingItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `finalPrice` on table `BillingItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BillingBatch" ADD COLUMN     "tariffId" TEXT;

-- AlterTable
ALTER TABLE "BillingItem" ADD COLUMN     "deliveryPsc" TEXT NOT NULL,
ADD COLUMN     "pricePerPallet" DECIMAL(65,30),
ADD COLUMN     "zoneLabel" TEXT,
ALTER COLUMN "tariffPrice" SET NOT NULL,
ALTER COLUMN "finalPrice" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
