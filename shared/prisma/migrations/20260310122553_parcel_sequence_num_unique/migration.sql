/*
  Warnings:

  - A unique constraint covering the columns `[sequenceNum]` on the table `Parcel` will be added. If there are existing duplicate values, this will fail.
  - Made the column `parcelId` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_parcelId_fkey";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "parcelId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_sequenceNum_key" ON "Parcel"("sequenceNum");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
