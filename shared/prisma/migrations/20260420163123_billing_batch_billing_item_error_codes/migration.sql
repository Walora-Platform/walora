-- CreateEnum
CREATE TYPE "BillingBatchErrorCode" AS ENUM ('TARIFF_NOT_FOUND', 'TARIFF_PART_NOT_FOUND');

-- CreateEnum
CREATE TYPE "BillingItemErrorCode" AS ENUM ('ZONE_NOT_FOUND', 'RATE_NOT_FOUND');

-- AlterTable
ALTER TABLE "BillingBatch" ADD COLUMN     "errorCode" "BillingBatchErrorCode";

-- AlterTable
ALTER TABLE "BillingItem" ADD COLUMN     "errorCode" "BillingItemErrorCode";
