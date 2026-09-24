-- AlterTable
ALTER TABLE "Parcel" 
ADD COLUMN     "deliveryNote" TEXT,
ADD COLUMN     "deliveryPscNew" TEXT,
ADD COLUMN     "pickupPscNew" TEXT;

UPDATE "Parcel"
SET
	"deliveryPscNew" = LPAD("deliveryPsc"::TEXT, 5, '0'),
	"pickupPscNew" = LPAD("pickupPsc"::TEXT, 5, '0');