/*
  Warnings:

  - Added the required column `totalParcels` to the `BillingBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillingBatch" ADD COLUMN     "totalParcels" INTEGER NOT NULL;
