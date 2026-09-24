/*
  Warnings:

  - The values [ARCHIVED] on the enum `TariffStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TariffStatus_new" AS ENUM ('WAITING', 'ACTIVE', 'INACTIVE');
ALTER TABLE "Tariff" ALTER COLUMN "status" TYPE "TariffStatus_new" USING ("status"::text::"TariffStatus_new");
ALTER TYPE "TariffStatus" RENAME TO "TariffStatus_old";
ALTER TYPE "TariffStatus_new" RENAME TO "TariffStatus";
DROP TYPE "public"."TariffStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
