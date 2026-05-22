/*
  Warnings:

  - You are about to drop the column `downPaymentAmount` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `downPaymentAmount` on the `reservations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "properties" DROP COLUMN "downPaymentAmount",
ADD COLUMN     "downPaymentPct" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "reservation_links" ADD COLUMN     "commissionPct" DECIMAL(5,2),
ADD COLUMN     "downPaymentPct" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "downPaymentAmount",
ADD COLUMN     "commissionPct" DECIMAL(5,2),
ADD COLUMN     "downPaymentPct" DECIMAL(5,2);
