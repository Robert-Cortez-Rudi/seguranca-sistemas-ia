-- DropIndex
DROP INDEX "RecoveryCode_userId_idx";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "mfaAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpLastStep" INTEGER;

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_codeHash_idx" ON "RecoveryCode"("userId", "codeHash");
