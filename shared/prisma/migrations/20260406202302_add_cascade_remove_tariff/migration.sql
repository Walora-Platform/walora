-- DropForeignKey
ALTER TABLE "TariffPart" DROP CONSTRAINT "TariffPart_tariffId_fkey";

-- DropForeignKey
ALTER TABLE "TariffSubject" DROP CONSTRAINT "TariffSubject_tariffId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_tariffPartId_fkey";

-- DropForeignKey
ALTER TABLE "ZoneRange" DROP CONSTRAINT "ZoneRange_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "ZoneRate" DROP CONSTRAINT "ZoneRate_zoneId_fkey";

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffPart" ADD CONSTRAINT "TariffPart_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_tariffPartId_fkey" FOREIGN KEY ("tariffPartId") REFERENCES "TariffPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneRange" ADD CONSTRAINT "ZoneRange_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneRate" ADD CONSTRAINT "ZoneRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
