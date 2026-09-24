/*
  Warnings:

  - A unique constraint covering the columns `[customerId,sequenceNum]` on the table `Parcel` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Parcel_sequenceNum_key";

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_customerId_sequenceNum_key" ON "Parcel"("customerId", "sequenceNum");
