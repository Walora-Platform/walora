-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raalCode" TEXT,
    "mobileNumber" TEXT,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lpName" TEXT,
    "lpStreet" TEXT,
    "lpCity" TEXT,
    "lpPSC" VARCHAR(10),
    "lpState" VARCHAR(20),
    "lpContactName" TEXT,
    "lpMobileNumber" TEXT,
    "lpEmail" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
