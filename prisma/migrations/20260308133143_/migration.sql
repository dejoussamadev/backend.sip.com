-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'PENDING', 'NOT_AVAILABLE', 'ON_HOLD', 'UPCOMING', 'ARCHIVED', 'TRASH', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyAccess" AS ENUM ('CALL_APPOINTMENT', 'DIRECT_APPOINTMENT', 'EMAIL_APPOINTMENT');

-- CreateEnum
CREATE TYPE "PropertyView" AS ENUM ('BEACH', 'CITY', 'COMMUNITY', 'FACILITIES', 'FULL_SEA', 'MARINA', 'MIXED', 'PARTIAL_MARINA', 'PARTIAL_SEA');

-- CreateTable
CREATE TABLE "agents" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+974',
    "designation" TEXT,
    "photo" TEXT,
    "bookmarkLimit" INTEGER NOT NULL DEFAULT 50,
    "onlinePropertyLimit" INTEGER NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "furnishings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "furnishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlords" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+974',
    "mobile" TEXT NOT NULL,
    "alternativeCountryCode" TEXT,
    "alternativeMobile" TEXT,
    "note" TEXT,
    "mapLink" TEXT,
    "marketingAgreement" TEXT,
    "draftContract" TEXT,

    CONSTRAINT "landlords_pkey" PRIMARY KEY ("id")
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
    "view" "PropertyView",
    "range" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING',
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "access" "PropertyAccess",
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
CREATE TABLE "types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_layouts" (
    "typeId" INTEGER NOT NULL,
    "layoutId" INTEGER NOT NULL,

    CONSTRAINT "type_layouts_pkey" PRIMARY KEY ("typeId","layoutId")
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

-- CreateIndex
CREATE UNIQUE INDEX "agents_agentCode_key" ON "agents"("agentCode");

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "furnishings_name_key" ON "furnishings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "layouts_name_key" ON "layouts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

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
CREATE UNIQUE INDEX "types_name_key" ON "types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "utilities_name_key" ON "utilities"("name");

-- AddForeignKey
ALTER TABLE "category_furnishings" ADD CONSTRAINT "category_furnishings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_furnishings" ADD CONSTRAINT "category_furnishings_furnishingId_fkey" FOREIGN KEY ("furnishingId") REFERENCES "furnishings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "type_layouts" ADD CONSTRAINT "type_layouts_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_layouts" ADD CONSTRAINT "type_layouts_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "layouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_utilities" ADD CONSTRAINT "property_utilities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_utilities" ADD CONSTRAINT "property_utilities_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "utilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
