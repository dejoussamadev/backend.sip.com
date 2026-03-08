/*
  Warnings:

  - The values [DRAFT,ACTIVE,SOLD,RENTED,EXPIRED] on the enum `PropertyStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PropertyStatus_new" AS ENUM ('AVAILABLE', 'PENDING', 'NOT_AVAILABLE', 'ON_HOLD', 'UPCOMING', 'ARCHIVED', 'TRASH', 'REJECTED');
ALTER TABLE "properties" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "properties" ALTER COLUMN "status" TYPE "PropertyStatus_new" USING ("status"::text::"PropertyStatus_new");
ALTER TYPE "PropertyStatus" RENAME TO "PropertyStatus_old";
ALTER TYPE "PropertyStatus_new" RENAME TO "PropertyStatus";
DROP TYPE "PropertyStatus_old";
ALTER TABLE "properties" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "status" SET DEFAULT 'PENDING';
