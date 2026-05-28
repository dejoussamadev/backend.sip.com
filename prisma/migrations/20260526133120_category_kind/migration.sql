-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('SALE', 'RENT');

-- AlterTable: add column nullable, backfill from existing names, then enforce NOT NULL.
ALTER TABLE "categories" ADD COLUMN "kind" "CategoryKind";

UPDATE "categories" SET "kind" = 'SALE'::"CategoryKind"
WHERE "kind" IS NULL AND "name" ILIKE '%sales%';

UPDATE "categories" SET "kind" = 'RENT'::"CategoryKind"
WHERE "kind" IS NULL AND ("name" ILIKE '%leasing%' OR "name" ILIKE '%rent%');

-- Any row still NULL means the name didn't match the known patterns; default to SALE to keep
-- NOT NULL satisfied. Admins can fix these manually post-migration.
UPDATE "categories" SET "kind" = 'SALE'::"CategoryKind" WHERE "kind" IS NULL;

ALTER TABLE "categories" ALTER COLUMN "kind" SET NOT NULL;
