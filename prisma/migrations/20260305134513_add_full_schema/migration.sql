/*
  Warnings:

  - You are about to drop the `Property` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyFacility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyFacilityPivot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyFurnishing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyLandlord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyLayout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyLocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyUtility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyUtilityPivot` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'RENTED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_furnishing_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_landlord_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_layout_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_location_id_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_type_id_fkey";

-- DropForeignKey
ALTER TABLE "PropertyFacility" DROP CONSTRAINT "PropertyFacility_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyFacilityPivot" DROP CONSTRAINT "PropertyFacilityPivot_facility_id_fkey";

-- DropForeignKey
ALTER TABLE "PropertyFacilityPivot" DROP CONSTRAINT "PropertyFacilityPivot_property_id_fkey";

-- DropForeignKey
ALTER TABLE "PropertyFurnishing" DROP CONSTRAINT "PropertyFurnishing_propertyCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyLayout" DROP CONSTRAINT "PropertyLayout_propertyTypeId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyType" DROP CONSTRAINT "PropertyType_propertyCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyUtility" DROP CONSTRAINT "PropertyUtility_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyUtilityPivot" DROP CONSTRAINT "PropertyUtilityPivot_property_id_fkey";

-- DropForeignKey
ALTER TABLE "PropertyUtilityPivot" DROP CONSTRAINT "PropertyUtilityPivot_utility_id_fkey";

-- DropTable
DROP TABLE "Property";

-- DropTable
DROP TABLE "PropertyCategory";

-- DropTable
DROP TABLE "PropertyFacility";

-- DropTable
DROP TABLE "PropertyFacilityPivot";

-- DropTable
DROP TABLE "PropertyFurnishing";

-- DropTable
DROP TABLE "PropertyLandlord";

-- DropTable
DROP TABLE "PropertyLayout";

-- DropTable
DROP TABLE "PropertyLocation";

-- DropTable
DROP TABLE "PropertyType";

-- DropTable
DROP TABLE "PropertyUtility";

-- DropTable
DROP TABLE "PropertyUtilityPivot";

-- CreateTable
CREATE TABLE "properties" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortTerm" BOOLEAN NOT NULL DEFAULT false,
    "unitNumber" TEXT,
    "bathrooms" INTEGER NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "maidRoom" BOOLEAN NOT NULL,
    "balcony" TEXT NOT NULL DEFAULT '',
    "view" TEXT NOT NULL DEFAULT '',
    "range" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "access" TEXT NOT NULL DEFAULT '',
    "hasUtilities" BOOLEAN NOT NULL DEFAULT false,
    "hasFacilities" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT NOT NULL,
    "directions" TEXT NOT NULL,
    "images" TEXT[],
    "document" TEXT,
    "categoryId" INTEGER,
    "typeId" INTEGER,
    "layoutId" INTEGER,
    "locationId" INTEGER,
    "furnishingId" INTEGER,
    "landlordId" INTEGER,
    "agentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "utilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_utilities" (
    "propertyId" INTEGER NOT NULL,
    "utilityId" INTEGER NOT NULL,

    CONSTRAINT "property_utilities_pkey" PRIMARY KEY ("propertyId","utilityId")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_facilities" (
    "propertyId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,

    CONSTRAINT "property_facilities_pkey" PRIMARY KEY ("propertyId","facilityId")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layouts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlords" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternativeMobile" TEXT,
    "note" TEXT,
    "mapLink" TEXT,
    "marketingAgreement" BOOLEAN NOT NULL DEFAULT false,
    "draftContract" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "landlords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furnishings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "furnishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_furnishings" (
    "categoryId" INTEGER NOT NULL,
    "furnishingId" INTEGER NOT NULL,

    CONSTRAINT "category_furnishings_pkey" PRIMARY KEY ("categoryId","furnishingId")
);

-- CreateTable
CREATE TABLE "category_types" (
    "categoryId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,

    CONSTRAINT "category_types_pkey" PRIMARY KEY ("categoryId","typeId")
);

-- CreateTable
CREATE TABLE "type_layouts" (
    "typeId" INTEGER NOT NULL,
    "layoutId" INTEGER NOT NULL,

    CONSTRAINT "type_layouts_pkey" PRIMARY KEY ("typeId","layoutId")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_referenceNumber_key" ON "properties"("referenceNumber");

-- CreateIndex
CREATE INDEX "properties_categoryId_idx" ON "properties"("categoryId");

-- CreateIndex
CREATE INDEX "properties_typeId_idx" ON "properties"("typeId");

-- CreateIndex
CREATE INDEX "properties_layoutId_idx" ON "properties"("layoutId");

-- CreateIndex
CREATE INDEX "properties_locationId_idx" ON "properties"("locationId");

-- CreateIndex
CREATE INDEX "properties_agentId_idx" ON "properties"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "utilities_name_key" ON "utilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "types_name_key" ON "types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "layouts_name_key" ON "layouts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "furnishings_name_key" ON "furnishings"("name");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_furnishingId_fkey" FOREIGN KEY ("furnishingId") REFERENCES "furnishings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_utilities" ADD CONSTRAINT "property_utilities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_utilities" ADD CONSTRAINT "property_utilities_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "utilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_furnishings" ADD CONSTRAINT "category_furnishings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_furnishings" ADD CONSTRAINT "category_furnishings_furnishingId_fkey" FOREIGN KEY ("furnishingId") REFERENCES "furnishings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_layouts" ADD CONSTRAINT "type_layouts_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_layouts" ADD CONSTRAINT "type_layouts_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "layouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
