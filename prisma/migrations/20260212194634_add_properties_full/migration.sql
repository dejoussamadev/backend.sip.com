-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortTerm" BOOLEAN NOT NULL DEFAULT false,
    "unitNo" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "layout" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "maidRoom" BOOLEAN DEFAULT false,
    "balcony" TEXT,
    "view" TEXT,
    "furnishing" TEXT,
    "sizeSqm" DOUBLE PRECISION,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'QAR',
    "commissionPct" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "locationCode" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "access" TEXT,
    "utilitiesIncluded" BOOLEAN DEFAULT false,
    "utilitiesWaterElec" BOOLEAN DEFAULT false,
    "utilitiesInternet" BOOLEAN DEFAULT false,
    "utilitiesServiceCharge" BOOLEAN DEFAULT false,
    "utilitiesSewage" BOOLEAN DEFAULT false,
    "utilitiesDistrictCooling" BOOLEAN DEFAULT false,
    "facilitiesEnabled" BOOLEAN DEFAULT false,
    "facSharedPool" BOOLEAN DEFAULT false,
    "facClubHouse" BOOLEAN DEFAULT false,
    "facSauna" BOOLEAN DEFAULT false,
    "facCinema" BOOLEAN DEFAULT false,
    "facSquash" BOOLEAN DEFAULT false,
    "facMultiPurposeHall" BOOLEAN DEFAULT false,
    "facCateringService" BOOLEAN DEFAULT false,
    "facPrivatePool" BOOLEAN DEFAULT false,
    "facKidsPlay" BOOLEAN DEFAULT false,
    "facSteamRoom" BOOLEAN DEFAULT false,
    "facPadelCourt" BOOLEAN DEFAULT false,
    "facBasketBall" BOOLEAN DEFAULT false,
    "facTennis" BOOLEAN DEFAULT false,
    "facMosque" BOOLEAN DEFAULT false,
    "facLaundryService" BOOLEAN DEFAULT false,
    "facGym" BOOLEAN DEFAULT false,
    "facJacuzzi" BOOLEAN DEFAULT false,
    "facBBQ" BOOLEAN DEFAULT false,
    "facFootball" BOOLEAN DEFAULT false,
    "facCoWorking" BOOLEAN DEFAULT false,
    "facCleaningService" BOOLEAN DEFAULT false,
    "propertyDetails" TEXT,
    "propertyNotes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landlordId" TEXT,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_refNo_key" ON "Property"("refNo");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_category_idx" ON "Property"("category");

-- CreateIndex
CREATE INDEX "Property_locationCode_idx" ON "Property"("locationCode");
