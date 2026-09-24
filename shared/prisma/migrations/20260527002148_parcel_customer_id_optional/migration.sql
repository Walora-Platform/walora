-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_customerId_fkey";

-- AlterTable
ALTER TABLE "Parcel" ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
