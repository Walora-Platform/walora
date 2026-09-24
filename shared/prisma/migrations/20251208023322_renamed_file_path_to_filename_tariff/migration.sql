/*
  Warnings:

  - You are about to drop the column `filePath` on the `Tariff` table. All the data in the column will be lost.
  - Added the required column `filename` to the `Tariff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tariff" DROP COLUMN "filePath",
ADD COLUMN     "filename" TEXT NOT NULL;
