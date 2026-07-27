ALTER TABLE "User"
  ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD CONSTRAINT "User_preferredLanguage_check"
  CHECK ("preferredLanguage" IN ('en', 'ar'));
