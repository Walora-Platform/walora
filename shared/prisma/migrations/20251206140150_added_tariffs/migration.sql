-- CreateEnum
CREATE TYPE "TariffPurpose" AS ENUM ('COST', 'REVENUE');

-- CreateEnum
CREATE TYPE "TariffStructure" AS ENUM ('ALL_IN_ONE', 'SPLIT');

-- CreateEnum
CREATE TYPE "TariffCalculation" AS ENUM ('PALLET', 'WEIGHT');

-- CreateEnum
CREATE TYPE "TariffPartType" AS ENUM ('ALL_IN_ONE', 'PICKUP', 'DELIVER');

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" "TariffPurpose" NOT NULL,
    "structure" "TariffStructure" NOT NULL,
    "calculation" "TariffCalculation" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffCarrier" (
    "tariffId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,

    CONSTRAINT "TariffCarrier_pkey" PRIMARY KEY ("tariffId","carrierId")
);

-- CreateTable
CREATE TABLE "TariffPart" (
    "id" TEXT NOT NULL,
    "partType" "TariffPartType" NOT NULL,
    "tariffId" TEXT NOT NULL,

    CONSTRAINT "TariffPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tariffPartId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneRange" (
    "id" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "ZoneRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "fromValue" INTEGER NOT NULL,
    "toValue" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tariff_isArchived_validFrom_validTo_idx" ON "Tariff"("isArchived", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "Zone_tariffPartId_idx" ON "Zone"("tariffPartId");

-- CreateIndex
CREATE INDEX "ZoneRange_start_end_idx" ON "ZoneRange"("start", "end");

-- CreateIndex
CREATE INDEX "ZoneRange_zoneId_idx" ON "ZoneRange"("zoneId");

-- AddForeignKey
ALTER TABLE "TariffCarrier" ADD CONSTRAINT "TariffCarrier_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffCarrier" ADD CONSTRAINT "TariffCarrier_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffPart" ADD CONSTRAINT "TariffPart_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_tariffPartId_fkey" FOREIGN KEY ("tariffPartId") REFERENCES "TariffPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneRange" ADD CONSTRAINT "ZoneRange_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
