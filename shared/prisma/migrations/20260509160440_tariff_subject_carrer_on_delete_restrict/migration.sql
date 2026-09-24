-- DropForeignKey
ALTER TABLE "TariffSubject" DROP CONSTRAINT "TariffSubject_carrierId_fkey";

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
