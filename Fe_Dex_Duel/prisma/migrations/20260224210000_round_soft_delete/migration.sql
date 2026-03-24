-- AlterTable
ALTER TABLE "Round" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Round" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Round" ADD COLUMN "hiddenReason" TEXT;

-- CreateIndex
CREATE INDEX "Round_isHidden_status_startTime_idx" ON "Round"("isHidden", "status", "startTime");
