-- CreateEnum
CREATE TYPE "ApiKeyVersion" AS ENUM ('v1');

-- CreateTable
CREATE TABLE "CustomerApiKey" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "version" "ApiKeyVersion" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerApiKey_keyPrefix_key" ON "CustomerApiKey"("keyPrefix");

-- AddForeignKey
ALTER TABLE "CustomerApiKey" ADD CONSTRAINT "CustomerApiKey_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
