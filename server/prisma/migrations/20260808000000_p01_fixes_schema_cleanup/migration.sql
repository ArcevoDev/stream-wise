-- AlterEnum
-- The seeded subject_catalog still contains rows for removed enum values.
-- The catalog is rebuilt idempotently by seed.ts, so purge them before the
-- enum cast (no other table uses the removed values — verified 2026-08-08).
DELETE FROM "subject_catalog"
WHERE "subject" IN (
  'SOCIAL_STUDIES', 'BOOK_KEEPING', 'MARKETING', 'OFFICE_PRACTICE', 'STORE_MANAGEMENT',
  'DATA_PROCESSING', 'BUSINESS_STUDIES', 'TRADE_WOODWORK', 'TRADE_METALWORK',
  'TRADE_ELECTRONICS', 'TRADE_AUTO_MECHANICS', 'TRADE_COSMETOLOGY', 'TRADE_CATERING_CRAFT',
  'TRADE_GARMENT_MAKING', 'TRADE_PLUMBING', 'TRADE_BUILDING_CONSTRUCTION',
  'TRADE_COMPUTER_CRAFT', 'BASIC_SCIENCE', 'CIVIC_EDUCATION', 'COMPUTER_STUDIES'
);
CREATE TYPE "Subject_new" AS ENUM ('ENGLISH_LANGUAGE', 'MATHEMATICS', 'CITIZENSHIP_AND_HERITAGE', 'DIGITAL_TECHNOLOGIES', 'BIOLOGY', 'CHEMISTRY', 'PHYSICS', 'FURTHER_MATHEMATICS', 'AGRICULTURAL_SCIENCE', 'ANIMAL_HUSBANDRY', 'TECHNICAL_DRAWING', 'FOOD_AND_NUTRITION', 'HOME_MANAGEMENT', 'LITERATURE_IN_ENGLISH', 'GOVERNMENT', 'HISTORY', 'GEOGRAPHY', 'CHRISTIAN_RELIGIOUS_STUDIES', 'ISLAMIC_RELIGIOUS_STUDIES', 'FRENCH', 'YORUBA', 'IGBO', 'HAUSA', 'ARABIC', 'VISUAL_ARTS', 'MUSIC', 'ECONOMICS', 'COMMERCE', 'FINANCIAL_ACCOUNTING');
ALTER TABLE "subject_catalog" ALTER COLUMN "subject" TYPE "Subject_new" USING ("subject"::text::"Subject_new");
ALTER TABLE "academic_profiles" ALTER COLUMN "tradeSubjectChosen" TYPE "Subject_new" USING ("tradeSubjectChosen"::text::"Subject_new");
ALTER TABLE "subject_scores" ALTER COLUMN "subject" TYPE "Subject_new" USING ("subject"::text::"Subject_new");
ALTER TABLE "jamb_course_subjects" ALTER COLUMN "subject" TYPE "Subject_new" USING ("subject"::text::"Subject_new");
ALTER TABLE "jamb_validations" ALTER COLUMN "missingSubjects" TYPE "Subject_new"[] USING ("missingSubjects"::text::"Subject_new"[]);
ALTER TYPE "Subject" RENAME TO "Subject_old";
ALTER TYPE "Subject_new" RENAME TO "Subject";
DROP TYPE "public"."Subject_old";

-- DropForeignKey
ALTER TABLE "counselors" DROP CONSTRAINT "counselors_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_counselorId_fkey";

-- DropIndex
DROP INDEX "schools_name_state_key";

-- DropIndex
DROP INDEX "schools_state_idx";

-- DropIndex
DROP INDEX "students_counselorId_idx";

-- AlterTable
ALTER TABLE "academic_sessions" DROP COLUMN "endedAt",
DROP COLUMN "startedAt";

-- AlterTable
ALTER TABLE "personality_profiles" ADD COLUMN     "emotionalStabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "schools" DROP COLUMN "address",
DROP COLUMN "lga",
DROP COLUMN "schoolType",
DROP COLUMN "state";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "counselorId";

-- AlterTable
ALTER TABLE "subject_catalog" DROP COLUMN "isActive",
DROP COLUMN "isTradeSubject",
DROP COLUMN "sortOrder",
DROP COLUMN "subjectCode";

-- DropTable
DROP TABLE "counselors";

-- CreateIndex
CREATE UNIQUE INDEX "schools_name_key" ON "schools"("name");
