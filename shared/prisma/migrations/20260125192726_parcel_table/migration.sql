-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerCode" TEXT NOT NULL,
    "payer" TEXT,
    "type" TEXT,
    "ladingDocumentNum" TEXT,
    "reference" TEXT,
    "palletsCount" INTEGER,
    "palletSpacesCount" DECIMAL(65,30),
    "weight" DECIMAL(65,30),
    "temperatureMode" TEXT,
    "pickupDate" TIMESTAMP(3),
    "pickupTimeFrom" TEXT,
    "pickupTimeTo" TEXT,
    "pickupName" TEXT NOT NULL,
    "pickupStreetAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupPsc" INTEGER NOT NULL,
    "pickupState" TEXT NOT NULL,
    "pickupContactName" TEXT,
    "pickupContactPhone" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "deliveryTimeFrom" TEXT,
    "deliveryTimeTo" TEXT,
    "deliveryName" TEXT NOT NULL,
    "deliveryStreetAddress" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryPsc" INTEGER NOT NULL,
    "deliveryState" TEXT NOT NULL,
    "deliveryContactName" TEXT,
    "deliveryContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
