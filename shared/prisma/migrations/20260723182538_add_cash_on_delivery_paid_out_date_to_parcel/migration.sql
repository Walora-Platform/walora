/*
  Warnings:

  - You are about to alter the column `cashOnDeliveryCurrency` on the `Parcel` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(3)`.

*/
-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "cashOnDeliveryPaidOutDate" DATE,
ALTER COLUMN "cashOnDeliveryCurrency" DROP DEFAULT,
ALTER COLUMN "cashOnDeliveryCurrency" SET DATA TYPE CHAR(3);
