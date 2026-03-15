/*
  Warnings:

  - Made the column `expiryDate` on table `landlords` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mapLink` on table `landlords` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marketingAgreement` on table `landlords` required. This step will fail if there are existing NULL values in that column.
  - Made the column `draftContract` on table `landlords` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "landlords" ALTER COLUMN "expiryDate" SET NOT NULL,
ALTER COLUMN "mapLink" SET NOT NULL,
ALTER COLUMN "marketingAgreement" SET NOT NULL,
ALTER COLUMN "draftContract" SET NOT NULL;
