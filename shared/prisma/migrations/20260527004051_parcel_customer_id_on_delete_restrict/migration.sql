-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_customerId_fkey";

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
