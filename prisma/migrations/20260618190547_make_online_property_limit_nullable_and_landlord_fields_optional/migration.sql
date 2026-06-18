-- AlterTable
ALTER TABLE "landlords" ALTER COLUMN "mapLink" DROP NOT NULL,
ALTER COLUMN "draftContract" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "onlinePropertyLimit" DROP NOT NULL,
ALTER COLUMN "onlinePropertyLimit" DROP DEFAULT;
