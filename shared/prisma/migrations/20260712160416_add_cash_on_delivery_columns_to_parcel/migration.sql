-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "cashOnDeliveryAmount" DECIMAL(65,30),
ADD COLUMN     "cashOnDeliveryCurrency" TEXT DEFAULT 'CZK';
