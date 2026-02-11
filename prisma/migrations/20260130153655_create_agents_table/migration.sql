-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'ADMIN', 'MANAGER');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+216',
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

-- CreateIndex
CREATE UNIQUE INDEX "agents_agentCode_key" ON "agents"("agentCode");

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");
