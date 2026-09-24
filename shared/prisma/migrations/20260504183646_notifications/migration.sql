-- CreateEnum
CREATE TYPE "ReceiveNotificationSettings" AS ENUM ('SYSTEM', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BILLING');

-- AlterTable
ALTER TABLE "CustomerCompany" ADD COLUMN     "billingEmail" TEXT;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "selectedCarrierId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "receiveNotificationsVia" "ReceiveNotificationSettings" NOT NULL DEFAULT 'SYSTEM';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("notificationId","userId")
);

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_selectedCarrierId_fkey" FOREIGN KEY ("selectedCarrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
