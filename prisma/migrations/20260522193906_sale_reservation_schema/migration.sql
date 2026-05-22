-- Add downPaymentAmount to properties
ALTER TABLE "properties" ADD COLUMN "downPaymentAmount" DECIMAL(15,2);

-- Update PaymentModality enum: replace PRORATED/NOT_PRORATED with new values
CREATE TYPE "PaymentModality_new" AS ENUM ('INSTALLMENT_OFF_PLAN', 'MORTGAGE', 'CASH_PAYMENT');
ALTER TABLE "reservations" ALTER COLUMN "paymentModality" TYPE "PaymentModality_new" USING 'CASH_PAYMENT'::"PaymentModality_new";
DROP TYPE "PaymentModality";
ALTER TYPE "PaymentModality_new" RENAME TO "PaymentModality";

-- Remove deprecated columns from reservations
ALTER TABLE "reservations" DROP COLUMN "bookingFeeModality";
ALTER TABLE "reservations" DROP COLUMN "utilitiesIncluded";
ALTER TABLE "reservations" DROP COLUMN "securityDeposit";

-- Rename paidBookingFee to sellingPrice
ALTER TABLE "reservations" RENAME COLUMN "paidBookingFee" TO "sellingPrice";

-- Add new reservation columns
ALTER TABLE "reservations" ADD COLUMN "downPaymentAmount" DECIMAL(15,2);
ALTER TABLE "reservations" ADD COLUMN "reservationFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "reservations" ALTER COLUMN "reservationFeeAmount" DROP DEFAULT;

-- Make moveInDate nullable
ALTER TABLE "reservations" ALTER COLUMN "moveInDate" DROP NOT NULL;

-- Drop unused enum types
DROP TYPE "BookingFeeModality";
DROP TYPE "SecurityDepositStatus";
