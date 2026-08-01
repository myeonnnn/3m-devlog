-- CreateEnum
CREATE TYPE "InsightPeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "periodType" "InsightPeriodType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "patterns" TEXT[],
    "logCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insight_ownerId_idx" ON "Insight"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_ownerId_periodType_periodKey_key" ON "Insight"("ownerId", "periodType", "periodKey");
