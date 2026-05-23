-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('FULL', 'PARTIAL');

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "paymentAmount" DECIMAL(15,2),
ADD COLUMN     "paymentMode" "PaymentMode";
