/*
  Warnings:

  - The values [MANAGER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Property` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `bedrooms` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `commissionPct` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `documents` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facBBQ` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facBasketBall` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facCateringService` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facCinema` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facCleaningService` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facClubHouse` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facCoWorking` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facFootball` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facGym` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facJacuzzi` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facKidsPlay` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facLaundryService` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facMosque` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facMultiPurposeHall` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facPadelCourt` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facPrivatePool` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facSauna` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facSharedPool` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facSquash` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facSteamRoom` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facTennis` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `facilitiesEnabled` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `furnishing` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrls` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordId` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `layout` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `locationCode` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `maidRoom` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `propertyDetails` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `propertyNotes` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `refNo` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `sizeSqm` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `unitNo` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesDistrictCooling` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesIncluded` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesInternet` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesServiceCharge` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesSewage` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `utilitiesWaterElec` on the `Property` table. All the data in the column will be lost.
  - The `id` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `agents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `agents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[reference_number]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commission` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `directions` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiration_date` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maid_room` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `range` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference_number` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Made the column `bathrooms` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `balcony` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `view` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `access` on table `Property` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('AGENT', 'ADMIN');
ALTER TABLE "agents" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "agents" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "agents" ALTER COLUMN "role" SET DEFAULT 'AGENT';
COMMIT;

-- DropIndex
DROP INDEX "Property_category_idx";

-- DropIndex
DROP INDEX "Property_locationCode_idx";

-- DropIndex
DROP INDEX "Property_refNo_key";

-- DropIndex
DROP INDEX "Property_status_idx";

-- DropIndex
DROP INDEX "Property_type_idx";

-- AlterTable
ALTER TABLE "Property" DROP CONSTRAINT "Property_pkey",
DROP COLUMN "address",
DROP COLUMN "agentId",
DROP COLUMN "bedrooms",
DROP COLUMN "category",
DROP COLUMN "commissionPct",
DROP COLUMN "createdAt",
DROP COLUMN "currency",
DROP COLUMN "documents",
DROP COLUMN "expiryDate",
DROP COLUMN "facBBQ",
DROP COLUMN "facBasketBall",
DROP COLUMN "facCateringService",
DROP COLUMN "facCinema",
DROP COLUMN "facCleaningService",
DROP COLUMN "facClubHouse",
DROP COLUMN "facCoWorking",
DROP COLUMN "facFootball",
DROP COLUMN "facGym",
DROP COLUMN "facJacuzzi",
DROP COLUMN "facKidsPlay",
DROP COLUMN "facLaundryService",
DROP COLUMN "facMosque",
DROP COLUMN "facMultiPurposeHall",
DROP COLUMN "facPadelCourt",
DROP COLUMN "facPrivatePool",
DROP COLUMN "facSauna",
DROP COLUMN "facSharedPool",
DROP COLUMN "facSquash",
DROP COLUMN "facSteamRoom",
DROP COLUMN "facTennis",
DROP COLUMN "facilitiesEnabled",
DROP COLUMN "furnishing",
DROP COLUMN "imageUrls",
DROP COLUMN "landlordId",
DROP COLUMN "latitude",
DROP COLUMN "layout",
DROP COLUMN "locationCode",
DROP COLUMN "longitude",
DROP COLUMN "maidRoom",
DROP COLUMN "price",
DROP COLUMN "propertyDetails",
DROP COLUMN "propertyNotes",
DROP COLUMN "refNo",
DROP COLUMN "sizeSqm",
DROP COLUMN "type",
DROP COLUMN "unitNo",
DROP COLUMN "updatedAt",
DROP COLUMN "utilitiesDistrictCooling",
DROP COLUMN "utilitiesIncluded",
DROP COLUMN "utilitiesInternet",
DROP COLUMN "utilitiesServiceCharge",
DROP COLUMN "utilitiesSewage",
DROP COLUMN "utilitiesWaterElec",
ADD COLUMN     "agent_id" INTEGER,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "commission" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "directions" TEXT NOT NULL,
ADD COLUMN     "document" TEXT,
ADD COLUMN     "expiration_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "furnishing_id" INTEGER,
ADD COLUMN     "has_facilities" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_utilities" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "landlord_id" INTEGER,
ADD COLUMN     "layout_id" INTEGER,
ADD COLUMN     "location_id" INTEGER,
ADD COLUMN     "maid_room" BOOLEAN NOT NULL,
ADD COLUMN     "range" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "reference_number" TEXT NOT NULL,
ADD COLUMN     "size" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "type_id" INTEGER,
ADD COLUMN     "unit_number" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "bathrooms" SET NOT NULL,
ALTER COLUMN "balcony" SET NOT NULL,
ALTER COLUMN "balcony" SET DEFAULT '',
ALTER COLUMN "view" SET NOT NULL,
ALTER COLUMN "view" SET DEFAULT '',
ALTER COLUMN "access" SET NOT NULL,
ALTER COLUMN "access" SET DEFAULT '',
ADD CONSTRAINT "Property_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "agents" DROP CONSTRAINT "agents_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "PropertyUtility" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyId" INTEGER,

    CONSTRAINT "PropertyUtility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyUtilityPivot" (
    "property_id" INTEGER NOT NULL,
    "utility_id" INTEGER NOT NULL,

    CONSTRAINT "PropertyUtilityPivot_pkey" PRIMARY KEY ("property_id","utility_id")
);

-- CreateTable
CREATE TABLE "PropertyFacility" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyId" INTEGER,

    CONSTRAINT "PropertyFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFacilityPivot" (
    "property_id" INTEGER NOT NULL,
    "facility_id" INTEGER NOT NULL,

    CONSTRAINT "PropertyFacilityPivot_pkey" PRIMARY KEY ("property_id","facility_id")
);

-- CreateTable
CREATE TABLE "PropertyCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PropertyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyCategoryId" INTEGER,

    CONSTRAINT "PropertyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLayout" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyTypeId" INTEGER,

    CONSTRAINT "PropertyLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PropertyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLandlord" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternative_mobile" TEXT,
    "note" TEXT,
    "map_link" TEXT,
    "marketing_agreement" BOOLEAN NOT NULL DEFAULT false,
    "draft_contract" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PropertyLandlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFurnishing" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyCategoryId" INTEGER,

    CONSTRAINT "PropertyFurnishing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyUtility_name_key" ON "PropertyUtility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFacility_name_key" ON "PropertyFacility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCategory_name_key" ON "PropertyCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyType_name_key" ON "PropertyType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLayout_name_key" ON "PropertyLayout"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLocation_name_key" ON "PropertyLocation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFurnishing_name_key" ON "PropertyFurnishing"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_number_key" ON "Property"("reference_number");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "PropertyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "PropertyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "PropertyLayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "PropertyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_furnishing_id_fkey" FOREIGN KEY ("furnishing_id") REFERENCES "PropertyFurnishing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "PropertyLandlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyUtility" ADD CONSTRAINT "PropertyUtility_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyUtilityPivot" ADD CONSTRAINT "PropertyUtilityPivot_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyUtilityPivot" ADD CONSTRAINT "PropertyUtilityPivot_utility_id_fkey" FOREIGN KEY ("utility_id") REFERENCES "PropertyUtility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFacility" ADD CONSTRAINT "PropertyFacility_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFacilityPivot" ADD CONSTRAINT "PropertyFacilityPivot_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFacilityPivot" ADD CONSTRAINT "PropertyFacilityPivot_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "PropertyFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyType" ADD CONSTRAINT "PropertyType_propertyCategoryId_fkey" FOREIGN KEY ("propertyCategoryId") REFERENCES "PropertyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLayout" ADD CONSTRAINT "PropertyLayout_propertyTypeId_fkey" FOREIGN KEY ("propertyTypeId") REFERENCES "PropertyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFurnishing" ADD CONSTRAINT "PropertyFurnishing_propertyCategoryId_fkey" FOREIGN KEY ("propertyCategoryId") REFERENCES "PropertyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
