/*
  Warnings:

  - The values [CALL_APPOINTEMENT,DIRECT_APPOINTEMENT,EMAIL_APPOINTEMENT] on the enum `PropertyAccess` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PropertyAccess_new" AS ENUM ('CALL_APPOINTMENT', 'DIRECT_APPOINTMENT', 'EMAIL_APPOINTMENT');
ALTER TABLE "properties" ALTER COLUMN "access" TYPE "PropertyAccess_new" USING ("access"::text::"PropertyAccess_new");
ALTER TYPE "PropertyAccess" RENAME TO "PropertyAccess_old";
ALTER TYPE "PropertyAccess_new" RENAME TO "PropertyAccess";
DROP TYPE "PropertyAccess_old";
COMMIT;
