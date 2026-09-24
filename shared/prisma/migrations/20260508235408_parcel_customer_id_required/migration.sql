/*
  Warnings:

  - Made the column `customerId` on table `Parcel` required. This step will fail if there are existing NULL values in that column.

*/

DELETE FROM "Parcel"
WHERE "customerId" IS NULL;

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_customerId_fkey";

-- AlterTable
ALTER TABLE "Parcel" ALTER COLUMN "customerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
