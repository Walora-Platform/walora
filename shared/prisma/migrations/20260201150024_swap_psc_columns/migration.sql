/*
  Warnings:

  - You are about to drop the column `deliveryPscNew` on the `Parcel` table. All the data in the column will be lost.
  - You are about to drop the column `pickupPscNew` on the `Parcel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Parcel" DROP COLUMN "deliveryPsc";
ALTER TABLE "Parcel" DROP COLUMN "pickupPsc";

ALTER TABLE "Parcel" RENAME COLUMN "deliveryPscNew" TO "deliveryPsc";
ALTER TABLE "Parcel" RENAME COLUMN "pickupPscNew" TO "pickupPsc";

ALTER TABLE "Parcel" ALTER COLUMN "deliveryPsc" SET NOT NULL;
ALTER TABLE "Parcel" ALTER COLUMN "pickupPsc" SET NOT NULL;
