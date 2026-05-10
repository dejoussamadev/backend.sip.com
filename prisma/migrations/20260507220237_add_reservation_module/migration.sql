-- CreateEnum
CREATE TYPE "ReservationIdType" AS ENUM ('ID', 'PASSPORT');

-- CreateEnum
CREATE TYPE "ContractPeriod" AS ENUM ('FIVE_MONTHS_OR_BELOW', 'SIX_MONTHS', 'TWELVE_MONTHS', 'THIRTEEN_MONTHS', 'FOURTEEN_MONTHS', 'FIFTEEN_MONTHS', 'TWENTY_FOUR_MONTHS');

-- CreateEnum
CREATE TYPE "PaymentModality" AS ENUM ('PRORATED', 'NOT_PRORATED');

-- CreateEnum
CREATE TYPE "BookingFeeModality" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "SecurityDepositStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_REJECTED';

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "idType" "ReservationIdType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "contractPeriod" "ContractPeriod" NOT NULL,
    "paymentModality" "PaymentModality" NOT NULL,
    "utilitiesIncluded" BOOLEAN NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "bookingFeeModality" "BookingFeeModality" NOT NULL,
    "paidBookingFee" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "securityDeposit" "SecurityDepositStatus" NOT NULL,
    "paymentProofUrl" TEXT,
    "consultantId" INTEGER NOT NULL,
    "clientSignatureUrl" TEXT NOT NULL,
    "consultantSignatureUrl" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "rejectionReason" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "linkId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_links" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "generatedById" INTEGER NOT NULL,
    "consultantSignatureUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_linkId_key" ON "reservations"("linkId");

-- CreateIndex
CREATE INDEX "reservations_propertyId_idx" ON "reservations"("propertyId");

-- CreateIndex
CREATE INDEX "reservations_createdById_idx" ON "reservations"("createdById");

-- CreateIndex
CREATE INDEX "reservations_consultantId_idx" ON "reservations"("consultantId");

-- CreateIndex
CREATE INDEX "reservations_contractPeriod_idx" ON "reservations"("contractPeriod");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservation_links_propertyId_idx" ON "reservation_links"("propertyId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "reservation_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_links" ADD CONSTRAINT "reservation_links_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_links" ADD CONSTRAINT "reservation_links_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
