-- Additive secure Telegram fulfillment configuration and grant history.
CREATE TYPE "CourseAccessGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REDEEMED', 'REVOKED', 'FAILED');

ALTER TABLE "Course"
  ADD COLUMN "telegramChatId" TEXT,
  ADD COLUMN "telegramAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CourseAccessGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "enrollmentId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'telegram',
  "externalInviteId" TEXT,
  "status" "CourseAccessGrantStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  CONSTRAINT "CourseAccessGrant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CourseAccessGrant" ADD CONSTRAINT "CourseAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseAccessGrant" ADD CONSTRAINT "CourseAccessGrant_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseAccessGrant" ADD CONSTRAINT "CourseAccessGrant_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseAccessGrant" ADD CONSTRAINT "CourseAccessGrant_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CourseAccessGrant_userId_courseId_createdAt_idx" ON "CourseAccessGrant"("userId", "courseId", "createdAt");
CREATE INDEX "CourseAccessGrant_status_expiresAt_idx" ON "CourseAccessGrant"("status", "expiresAt");
CREATE INDEX "CourseAccessGrant_purchaseId_status_idx" ON "CourseAccessGrant"("purchaseId", "status");
CREATE INDEX "CourseAccessGrant_enrollmentId_idx" ON "CourseAccessGrant"("enrollmentId");

-- At most one in-flight Telegram API request per user/course. PostgreSQL partial
-- uniqueness keeps concurrent server instances from creating parallel invites.
CREATE UNIQUE INDEX "CourseAccessGrant_userId_courseId_pending_key"
  ON "CourseAccessGrant"("userId", "courseId")
  WHERE "status" = 'PENDING';
