/*
  Warnings:

  - The values [TARIFF_PART_NOT_FOUND] on the enum `BillingBatchErrorCode` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `hasErrors` on table `BillingBatch` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BillingBatchErrorCode_new" AS ENUM ('TARIFF_NOT_FOUND');
ALTER TABLE "BillingBatch" ALTER COLUMN "errorCode" TYPE "BillingBatchErrorCode_new" USING ("errorCode"::text::"BillingBatchErrorCode_new");
ALTER TYPE "BillingBatchErrorCode" RENAME TO "BillingBatchErrorCode_old";
ALTER TYPE "BillingBatchErrorCode_new" RENAME TO "BillingBatchErrorCode";
DROP TYPE "public"."BillingBatchErrorCode_old";
COMMIT;

-- AlterTable
ALTER TABLE "BillingBatch" ALTER COLUMN "hasErrors" SET NOT NULL,
ALTER COLUMN "hasErrors" SET DEFAULT false;
