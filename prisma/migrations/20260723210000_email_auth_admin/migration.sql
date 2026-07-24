CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED', 'MIGRATION_REQUIRED');
CREATE TYPE "EmailChallengePurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE');

ALTER TABLE "User"
  ADD COLUMN "normalizedEmail" TEXT,
  ADD COLUMN "pendingEmail" TEXT,
  ADD COLUMN "legacyPhoneE164" TEXT,
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

WITH ranked AS (
  SELECT "id",
         CASE
           WHEN "email" IS NOT NULL AND BTRIM("email") <> '' THEN LOWER(BTRIM("email"))
           ELSE NULL
         END AS candidate,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(BTRIM("email"))
           ORDER BY "createdAt", "id"
         ) AS duplicate_rank
  FROM "User"
)
UPDATE "User" AS users
SET
  "legacyPhoneE164" = users."phoneE164",
  "normalizedEmail" = CASE
    WHEN ranked.candidate IS NOT NULL AND ranked.duplicate_rank = 1 THEN ranked.candidate
    ELSE 'legacy+' || users."id" || '@migration.invalid'
  END,
  "email" = CASE
    WHEN ranked.candidate IS NOT NULL AND ranked.duplicate_rank = 1 THEN ranked.candidate
    ELSE 'legacy+' || users."id" || '@migration.invalid'
  END,
  "status" = CASE
    WHEN users."emailVerifiedAt" IS NOT NULL AND ranked.candidate IS NOT NULL AND ranked.duplicate_rank = 1
      THEN 'ACTIVE'::"UserStatus"
    ELSE 'MIGRATION_REQUIRED'::"UserStatus"
  END
FROM ranked
WHERE users."id" = ranked."id";

ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "normalizedEmail" SET NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_phoneE164_key";
ALTER TABLE "User" DROP COLUMN "phoneE164";
ALTER TABLE "User" DROP COLUMN "phoneVerifiedAt";
ALTER TABLE "User" DROP COLUMN "pendingPhoneE164";

CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "User"("normalizedEmail");
CREATE UNIQUE INDEX "User_legacyPhoneE164_key" ON "User"("legacyPhoneE164");
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");

DROP TABLE IF EXISTS "VerificationAttempt";
DROP TABLE IF EXISTS "RecoveryCode";
DROP TYPE IF EXISTS "VerificationPurpose";
DROP TYPE IF EXISTS "VerificationState";

CREATE TABLE "EmailVerificationChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "EmailChallengePurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerificationChallenge_userId_purpose_createdAt_idx" ON "EmailVerificationChallenge"("userId", "purpose", "createdAt");
CREATE INDEX "EmailVerificationChallenge_email_purpose_createdAt_idx" ON "EmailVerificationChallenge"("email", "purpose", "createdAt");
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_revokedAt_expiresAt_idx" ON "Session"("userId", "revokedAt", "expiresAt");

ALTER TABLE "IdentityAuditLog" RENAME TO "SecurityAuditLog";
ALTER TABLE "SecurityAuditLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "SecurityAuditLog" ADD COLUMN "actorId" TEXT;
ALTER TABLE "SecurityAuditLog"
  ADD CONSTRAINT "SecurityAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityAuditLog" DROP CONSTRAINT IF EXISTS "IdentityAuditLog_userId_fkey";
ALTER TABLE "SecurityAuditLog"
  ADD CONSTRAINT "SecurityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER INDEX IF EXISTS "IdentityAuditLog_pkey" RENAME TO "SecurityAuditLog_pkey";
ALTER INDEX IF EXISTS "IdentityAuditLog_userId_createdAt_idx" RENAME TO "SecurityAuditLog_userId_createdAt_idx";
CREATE INDEX "SecurityAuditLog_actorId_createdAt_idx" ON "SecurityAuditLog"("actorId", "createdAt");
CREATE INDEX "SecurityAuditLog_action_createdAt_idx" ON "SecurityAuditLog"("action", "createdAt");

ALTER TABLE "Course" ADD COLUMN "instructorId" TEXT;
ALTER TABLE "Course"
  ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Course_instructorId_idx" ON "Course"("instructorId");
