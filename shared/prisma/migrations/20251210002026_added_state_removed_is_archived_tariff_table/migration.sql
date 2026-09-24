/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Tariff` table. All the data in the column will be lost.
  - Added the required column `status` to the `Tariff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TariffStatus" AS ENUM ('WAITING', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- DropIndex
DROP INDEX "Tariff_isArchived_validFrom_validTo_idx";

-- AlterTable - first switch from isArchived to status column, then set the status to NOT NULL and drop isArchived
ALTER TABLE "Tariff"
ADD COLUMN "status" "TariffStatus";

UPDATE "Tariff"
SET "status" = CASE
  WHEN "isArchived" = true THEN 'ARCHIVED'::"TariffStatus"
  ELSE 'ACTIVE'::"TariffStatus"
END;

ALTER TABLE "Tariff"
ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "Tariff"
DROP COLUMN "isArchived";

-- CreateIndex
CREATE INDEX "Tariff_status_validFrom_validTo_idx" ON "Tariff"("status", "validFrom", "validTo");
