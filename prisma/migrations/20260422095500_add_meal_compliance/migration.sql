-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER');

-- CreateTable
CREATE TABLE "meal_compliance" (
    "id" TEXT NOT NULL,
    "dailyComplianceId" TEXT NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_compliance_dailyComplianceId_slot_key" ON "meal_compliance"("dailyComplianceId", "slot");

-- AddForeignKey
ALTER TABLE "meal_compliance" ADD CONSTRAINT "meal_compliance_dailyComplianceId_fkey" FOREIGN KEY ("dailyComplianceId") REFERENCES "daily_compliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
