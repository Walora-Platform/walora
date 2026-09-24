/*
  Warnings:

  - Added the required column `lastUsedAt` to the `CustomerApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerApiKey" ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "volume" DECIMAL(65,30);
