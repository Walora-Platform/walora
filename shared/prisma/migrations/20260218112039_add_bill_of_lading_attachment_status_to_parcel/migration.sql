-- CreateEnum
CREATE TYPE "BillOfLadingAttachmentStatus" AS ENUM ('UNCONFIRMED_BILL_OF_LADING_NOT_ATTACHED_IN_TIME', 'UNCONFIRMED_BILL_OF_LADING_ATTACHED', 'CONFIRMED_BILL_OF_LADING_ATTACHED');

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "billOfLadingAttachmentStatus" "BillOfLadingAttachmentStatus";
