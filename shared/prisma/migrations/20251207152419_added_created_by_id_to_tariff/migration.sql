/*
  Warnings:

  - Added the required column `createdById` to the `Tariff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "createdById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
