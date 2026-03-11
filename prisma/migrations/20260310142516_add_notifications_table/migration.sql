/*
  Warnings:

  - Made the column `categoryId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `typeId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `layoutId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `locationId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `furnishingId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `landlordId` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `agentId` on table `properties` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROPERTY_CREATED', 'PROPERTY_UPDATED', 'AGENT_CREATED', 'AGENT_UPDATED');

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_agentId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_furnishingId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_landlordId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_layoutId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_locationId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_typeId_fkey";

-- Delete properties with NULL foreign keys before making columns NOT NULL
DELETE FROM "property_utilities" WHERE "propertyId" IN (
  SELECT "id" FROM "properties"
  WHERE "agentId" IS NULL
     OR "categoryId" IS NULL
     OR "typeId" IS NULL
     OR "layoutId" IS NULL
     OR "locationId" IS NULL
     OR "furnishingId" IS NULL
     OR "landlordId" IS NULL
);

DELETE FROM "property_facilities" WHERE "propertyId" IN (
  SELECT "id" FROM "properties"
  WHERE "agentId" IS NULL
     OR "categoryId" IS NULL
     OR "typeId" IS NULL
     OR "layoutId" IS NULL
     OR "locationId" IS NULL
     OR "furnishingId" IS NULL
     OR "landlordId" IS NULL
);

DELETE FROM "properties"
WHERE "agentId" IS NULL
   OR "categoryId" IS NULL
   OR "typeId" IS NULL
   OR "layoutId" IS NULL
   OR "locationId" IS NULL
   OR "furnishingId" IS NULL
   OR "landlordId" IS NULL;

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "typeId" SET NOT NULL,
ALTER COLUMN "layoutId" SET NOT NULL,
ALTER COLUMN "locationId" SET NOT NULL,
ALTER COLUMN "furnishingId" SET NOT NULL,
ALTER COLUMN "landlordId" SET NOT NULL,
ALTER COLUMN "agentId" SET NOT NULL;

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "layouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_furnishingId_fkey" FOREIGN KEY ("furnishingId") REFERENCES "furnishings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
