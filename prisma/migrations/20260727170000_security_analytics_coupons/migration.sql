ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETION_PENDING';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETED';

CREATE TYPE "LoginEventType" AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'EMAIL_CHANGED',
  'SESSION_REVOKED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_REACTIVATED'
);

CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('RESERVED', 'REDEEMED', 'RELEASED');

ALTER TABLE "User"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT,
  ADD COLUMN "deletionReason" TEXT,
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");
CREATE INDEX "User_deletionRequestedAt_idx" ON "User"("deletionRequestedAt");

ALTER TABLE "Session"
  ADD COLUMN "publicId" TEXT,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revocationReason" TEXT,
  ADD COLUMN "userAgentSummary" TEXT,
  ADD COLUMN "deviceType" TEXT,
  ADD COLUMN "browser" TEXT,
  ADD COLUMN "operatingSystem" TEXT,
  ADD COLUMN "ipHash" TEXT,
  ADD COLUMN "maskedIp" TEXT;

UPDATE "Session" SET "publicId" = md5("id" || clock_timestamp()::text || random()::text);
ALTER TABLE "Session" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Session_publicId_key" ON "Session"("publicId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");

ALTER TABLE "SecurityAuditLog"
  ADD COLUMN "actorRole" "UserRole",
  ADD COLUMN "category" TEXT,
  ADD COLUMN "entityType" TEXT,
  ADD COLUMN "entityId" TEXT,
  ADD COLUMN "targetUserId" TEXT,
  ADD COLUMN "userAgentSummary" TEXT;

CREATE INDEX "SecurityAuditLog_targetUserId_createdAt_idx" ON "SecurityAuditLog"("targetUserId", "createdAt");
CREATE INDEX "SecurityAuditLog_entityType_entityId_createdAt_idx" ON "SecurityAuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

CREATE TABLE "LoginEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" "LoginEventType" NOT NULL,
  "success" BOOLEAN NOT NULL,
  "ipHash" TEXT,
  "ipDisplayMasked" TEXT,
  "userAgentSummary" TEXT,
  "deviceType" TEXT,
  "browser" TEXT,
  "operatingSystem" TEXT,
  "countryCode" TEXT,
  "city" TEXT,
  "failureReasonCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");
CREATE INDEX "LoginEvent_eventType_createdAt_idx" ON "LoginEvent"("eventType", "createdAt");
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");

ALTER TABLE "Purchase"
  ADD COLUMN "originalAmountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discountAmountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "couponId" TEXT,
  ADD COLUMN "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundReference" TEXT,
  ADD COLUMN "refundAdminNote" TEXT;

UPDATE "Purchase" SET "originalAmountCents" = "amountCents";

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "descriptionAr" TEXT NOT NULL,
  "discountType" "DiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "currency" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "totalUsageLimit" INTEGER,
  "perUserUsageLimit" INTEGER,
  "minimumOrderAmount" INTEGER NOT NULL DEFAULT 0,
  "maximumDiscountAmount" INTEGER,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Coupon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Coupon_value_check" CHECK (
    ("discountType" = 'PERCENTAGE' AND "discountValue" > 0 AND "discountValue" <= 100)
    OR ("discountType" = 'FIXED_AMOUNT' AND "discountValue" > 0 AND "currency" IS NOT NULL)
  ),
  CONSTRAINT "Coupon_limits_check" CHECK (
    ("totalUsageLimit" IS NULL OR "totalUsageLimit" > 0)
    AND ("perUserUsageLimit" IS NULL OR "perUserUsageLimit" > 0)
    AND "minimumOrderAmount" >= 0
    AND ("maximumDiscountAmount" IS NULL OR "maximumDiscountAmount" > 0)
    AND ("expiresAt" IS NULL OR "startsAt" IS NULL OR "expiresAt" > "startsAt")
  )
);

CREATE UNIQUE INDEX "Coupon_normalizedCode_key" ON "Coupon"("normalizedCode");
CREATE INDEX "Coupon_active_startsAt_expiresAt_idx" ON "Coupon"("active", "startsAt", "expiresAt");
CREATE INDEX "Coupon_createdAt_idx" ON "Coupon"("createdAt");

CREATE TABLE "CouponProduct" (
  "couponId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "CouponProduct_pkey" PRIMARY KEY ("couponId", "courseId"),
  CONSTRAINT "CouponProduct_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponProduct_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CouponProduct_courseId_idx" ON "CouponProduct"("courseId");

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_discount_check" CHECK ("discountAmount" >= 0)
);

CREATE UNIQUE INDEX "CouponRedemption_purchaseId_key" ON "CouponRedemption"("purchaseId");
CREATE INDEX "CouponRedemption_couponId_status_expiresAt_idx" ON "CouponRedemption"("couponId", "status", "expiresAt");
CREATE INDEX "CouponRedemption_userId_couponId_status_idx" ON "CouponRedemption"("userId", "couponId", "status");
CREATE INDEX "CouponRedemption_expiresAt_status_idx" ON "CouponRedemption"("expiresAt", "status");

ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Purchase_status_createdAt_idx" ON "Purchase"("status", "createdAt");
CREATE INDEX "Purchase_couponId_status_idx" ON "Purchase"("couponId", "status");
