/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Tariff` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TariffStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Tariff" DROP COLUMN "isArchived";
