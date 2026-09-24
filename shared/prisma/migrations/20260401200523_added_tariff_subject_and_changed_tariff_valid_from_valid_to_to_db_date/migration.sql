/*
  Warnings:

  - You are about to drop the `TariffCarrier` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TariffSubjectType" AS ENUM ('CARRIER', 'CUSTOMER');

-- DropForeignKey
ALTER TABLE "TariffCarrier" DROP CONSTRAINT "TariffCarrier_carrierId_fkey";

-- DropForeignKey
ALTER TABLE "TariffCarrier" DROP CONSTRAINT "TariffCarrier_tariffId_fkey";

-- AlterTable
ALTER TABLE "Tariff" ALTER COLUMN "validFrom" SET DATA TYPE DATE,
ALTER COLUMN "validTo" SET DATA TYPE DATE;

-- DropTable
DROP TABLE "TariffCarrier";

-- CreateTable
CREATE TABLE "TariffSubject" (
    "id" TEXT NOT NULL,
    "type" "TariffSubjectType" NOT NULL,
    "tariffId" TEXT NOT NULL,
    "customerCompanyId" TEXT,
    "carrierId" TEXT,

    CONSTRAINT "TariffSubject_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
