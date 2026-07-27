ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Course"
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "shortDescriptionEn" TEXT,
  ADD COLUMN "shortDescriptionAr" TEXT,
  ADD COLUMN "fullDescriptionEn" TEXT,
  ADD COLUMN "fullDescriptionAr" TEXT,
  ADD COLUMN "telegramAccessUrl" TEXT,
  ADD COLUMN "telegramButtonLabelEn" TEXT,
  ADD COLUMN "telegramButtonLabelAr" TEXT;

UPDATE "Course"
SET
  "titleEn" = "title",
  "titleAr" = "title",
  "shortDescriptionEn" = "description",
  "shortDescriptionAr" = "description",
  "fullDescriptionEn" = "longDescription",
  "fullDescriptionAr" = "longDescription";

ALTER TABLE "Course"
  ALTER COLUMN "titleEn" SET NOT NULL,
  ALTER COLUMN "titleAr" SET NOT NULL,
  ALTER COLUMN "shortDescriptionEn" SET NOT NULL,
  ALTER COLUMN "shortDescriptionAr" SET NOT NULL,
  ALTER COLUMN "fullDescriptionEn" SET NOT NULL,
  ALTER COLUMN "fullDescriptionAr" SET NOT NULL;

DROP TABLE IF EXISTS "PlaybackSession";
DROP TABLE IF EXISTS "VideoAsset";
DROP TABLE IF EXISTS "LessonNote";
DROP TABLE IF EXISTS "LessonProgress";
DROP TABLE IF EXISTS "Lesson";
DROP TABLE IF EXISTS "CourseModule";
DROP TYPE IF EXISTS "VideoState";

ALTER TABLE "Course"
  DROP COLUMN "title",
  DROP COLUMN "eyebrow",
  DROP COLUMN "description",
  DROP COLUMN "longDescription",
  DROP COLUMN "difficulty",
  DROP COLUMN "duration",
  DROP COLUMN "lessonCount",
  DROP COLUMN "rating",
  DROP COLUMN "reviewCount",
  DROP COLUMN "outcomes",
  DROP COLUMN "requirements";
