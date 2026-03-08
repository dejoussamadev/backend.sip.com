/*
  Warnings:

  - Changed the type of `view` on the `properties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `access` on the `properties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PropertyAccess" AS ENUM ('CALL_APPOINTMENT', 'DIRECT_APPOINTMENT', 'EMAIL_APPOINTMENT');

-- CreateEnum
CREATE TYPE "PropertyView" AS ENUM ('CITY', 'COMMUNITY', 'FACILITIES', 'FULL_SEA', 'MARINA', 'MIXED', 'PARTIAL_MARINA', 'PARTIAL_SEA');

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "view",
ADD COLUMN     "view" "PropertyView" NOT NULL,
DROP COLUMN "access",
ADD COLUMN     "access" "PropertyAccess" NOT NULL;
