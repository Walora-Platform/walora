/*
  Warnings:

  - You are about to drop the `Rate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rate" DROP CONSTRAINT "Rate_zoneId_fkey";

-- DropTable
DROP TABLE "Rate";

-- CreateTable
CREATE TABLE "ZoneRate" (
    "id" TEXT NOT NULL,
    "fromValue" INTEGER NOT NULL,
    "toValue" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "ZoneRate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ZoneRate" ADD CONSTRAINT "ZoneRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
