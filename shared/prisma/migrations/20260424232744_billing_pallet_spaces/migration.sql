/*
  Warnings:

  - You are about to drop the column `totalPallets` on the `BillingItem` table. All the data in the column will be lost.
  - Added the required column `totalPalletSpaces` to the `BillingBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `palletSpacesSum` to the `BillingItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `palletsSum` to the `BillingItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillingBatch" ADD COLUMN     "totalPalletSpaces" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "BillingItem" DROP COLUMN "totalPallets",
ADD COLUMN     "palletSpacesSum" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "palletsSum" INTEGER NOT NULL;
