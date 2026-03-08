-- AlterTable
ALTER TABLE "landlords" ADD COLUMN     "alternativeCountryCode" TEXT,
ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT '+974',
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ALTER COLUMN "marketingAgreement" DROP NOT NULL,
ALTER COLUMN "marketingAgreement" DROP DEFAULT,
ALTER COLUMN "marketingAgreement" SET DATA TYPE TEXT,
ALTER COLUMN "draftContract" DROP NOT NULL,
ALTER COLUMN "draftContract" DROP DEFAULT,
ALTER COLUMN "draftContract" SET DATA TYPE TEXT;
