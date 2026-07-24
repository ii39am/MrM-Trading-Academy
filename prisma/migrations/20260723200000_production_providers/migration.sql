CREATE TYPE "UserRole" AS ENUM ('STUDENT','INSTRUCTOR','ADMIN');
CREATE TYPE "VerificationPurpose" AS ENUM ('REGISTRATION','LOGIN','PHONE_CHANGE','RECOVERY');
CREATE TYPE "VerificationState" AS ENUM ('PENDING','APPROVED','EXPIRED','MAX_ATTEMPTS','CANCELLED');
CREATE TYPE "VideoState" AS ENUM ('EMPTY','UPLOADING','PROCESSING','READY','ERROR','CANCELLED');

ALTER TABLE "User"
  ADD COLUMN "phoneE164" TEXT,
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "pendingPhoneE164" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

UPDATE "User"
SET "phoneE164" = '+1999' || lpad(row_number::text, 7, '0')
FROM (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS row_number
  FROM "User"
) legacy
WHERE "User"."id" = legacy."id";

ALTER TABLE "User" ALTER COLUMN "phoneE164" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" DROP COLUMN "verifiedAt";
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

ALTER TABLE "Purchase"
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "expectedAmount" DECIMAL(30,12),
  ADD COLUMN "receivedAmount" DECIMAL(30,12),
  ADD COLUMN "payCurrency" TEXT,
  ADD COLUMN "network" TEXT,
  ADD COLUMN "paymentAddress" TEXT,
  ADD COLUMN "transactionHash" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "rawWebhookHash" TEXT;
CREATE UNIQUE INDEX "Purchase_providerPaymentId_key" ON "Purchase"("providerPaymentId");

CREATE TABLE "VerificationAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "phoneE164" TEXT NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL,
  "providerSid" TEXT,
  "state" "VerificationState" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "VerificationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "VerificationAttempt_phoneE164_purpose_sentAt_idx" ON "VerificationAttempt"("phoneE164","purpose","sentAt");
CREATE INDEX "VerificationAttempt_userId_purpose_idx" ON "VerificationAttempt"("userId","purpose");

CREATE TABLE "RecoveryCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "RecoveryCode_userId_usedAt_idx" ON "RecoveryCode"("userId","usedAt");

CREATE TABLE "IdentityAuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ipHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "IdentityAuditLog_userId_createdAt_idx" ON "IdentityAuditLog"("userId","createdAt");

CREATE TABLE "VideoAsset" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL UNIQUE,
  "cloudflareUid" TEXT UNIQUE,
  "state" "VideoState" NOT NULL DEFAULT 'EMPTY',
  "uploadId" TEXT,
  "durationSeconds" DOUBLE PRECISION,
  "thumbnailUrl" TEXT,
  "errorMessage" TEXT,
  "replacedUid" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoAsset_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE
);
CREATE INDEX "VideoAsset_state_updatedAt_idx" ON "VideoAsset"("state","updatedAt");

CREATE TABLE "PlaybackSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL UNIQUE,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "suspicious" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PlaybackSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "PlaybackSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE
);
CREATE INDEX "PlaybackSession_userId_expiresAt_revokedAt_idx" ON "PlaybackSession"("userId","expiresAt","revokedAt");
