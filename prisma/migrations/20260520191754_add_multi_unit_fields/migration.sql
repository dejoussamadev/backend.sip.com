-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "multipleUnits" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reservation_links" ADD COLUMN     "unitNumber" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "unitNumber" TEXT;

-- Backfill: snapshot each reservation's unit from its parent property
UPDATE "reservations" SET "unitNumber" = (SELECT "unitNumber" FROM "properties" WHERE "properties"."id" = "reservations"."propertyId") WHERE "unitNumber" IS NULL;
