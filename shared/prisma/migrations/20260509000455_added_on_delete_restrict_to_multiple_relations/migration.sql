-- DropForeignKey
ALTER TABLE "BillingBatch" DROP CONSTRAINT "BillingBatch_tariffId_fkey";

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_billingItemId_fkey";

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_selectedCarrierId_fkey";

-- DropForeignKey
ALTER TABLE "TariffSubject" DROP CONSTRAINT "TariffSubject_customerCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_customerCompanyId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_selectedCarrierId_fkey" FOREIGN KEY ("selectedCarrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_billingItemId_fkey" FOREIGN KEY ("billingItemId") REFERENCES "BillingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffSubject" ADD CONSTRAINT "TariffSubject_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
