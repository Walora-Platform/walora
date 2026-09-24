/*
  Warnings:

  - Added the required column `totalPallets` to the `BillingBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BillingBatch" ADD COLUMN     "totalPallets" INTEGER NOT NULL;
