/*
  Warnings:

  - You are about to drop the column `ladingDocumentNum` on the `Parcel` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('UNKNOWN', 'UNCONFIRMED_BILL_OF_LADING', 'CONFIRMED_BILL_OF_LADING');

-- DropIndex
DROP INDEX "Parcel_ladingDocumentNum_idx";

-- AlterTable
ALTER TABLE "Parcel"
RENAME COLUMN "ladingDocumentNum" TO "billOfLadingNum";

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'UNKNOWN',
    "parcelId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcel_billOfLadingNum_idx" ON "Parcel"("billOfLadingNum");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
