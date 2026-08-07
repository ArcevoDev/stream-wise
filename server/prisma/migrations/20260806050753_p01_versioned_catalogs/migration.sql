-- AlterTable
ALTER TABLE "bfi_responses" ADD COLUMN     "instrumentVersion" TEXT NOT NULL DEFAULT 'bfi-v1';

-- AlterTable
ALTER TABLE "jamb_courses" ADD COLUMN     "admissionCycle" TEXT NOT NULL DEFAULT '2025/2026';

-- AlterTable
ALTER TABLE "recommendation_logs" ADD COLUMN     "academicSessionName" TEXT,
ADD COLUMN     "ahpWeightSetId" TEXT,
ADD COLUMN     "jambRequirementVersion" TEXT;

-- AlterTable
ALTER TABLE "riasec_responses" ADD COLUMN     "instrumentVersion" TEXT NOT NULL DEFAULT 'riasec-v1';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "consentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "consentPoint1" BOOLEAN,
ADD COLUMN     "consentPoint2" BOOLEAN,
ADD COLUMN     "consentPoint3" BOOLEAN,
ADD COLUMN     "consentPoint4" BOOLEAN,
ADD COLUMN     "consentStatus" TEXT,
ADD COLUMN     "consentVersion" TEXT;

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_catalog" (
    "id" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streamCategory" "AcademicStream",
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "isTradeSubject" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ahp_weight_sets" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "label" TEXT,
    "criterionLabels" JSONB NOT NULL,
    "pairwiseMatrix" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "lambdaMax" DOUBLE PRECISION NOT NULL,
    "ci" DOUBLE PRECISION NOT NULL,
    "cr" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "academicSessionId" TEXT,

    CONSTRAINT "ahp_weight_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_name_key" ON "academic_sessions"("name");

-- CreateIndex
CREATE INDEX "subject_catalog_academicSessionId_isCore_idx" ON "subject_catalog"("academicSessionId", "isCore");

-- CreateIndex
CREATE INDEX "subject_catalog_streamCategory_idx" ON "subject_catalog"("streamCategory");

-- CreateIndex
CREATE UNIQUE INDEX "subject_catalog_academicSessionId_subject_key" ON "subject_catalog"("academicSessionId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "ahp_weight_sets_version_key" ON "ahp_weight_sets"("version");

-- CreateIndex
CREATE INDEX "ahp_weight_sets_isActive_idx" ON "ahp_weight_sets"("isActive");

-- CreateIndex
CREATE INDEX "jamb_courses_admissionCycle_idx" ON "jamb_courses"("admissionCycle");

-- AddForeignKey
ALTER TABLE "subject_catalog" ADD CONSTRAINT "subject_catalog_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ahp_weight_sets" ADD CONSTRAINT "ahp_weight_sets_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "recommendation_logs_ahpWeightSetId_fkey" FOREIGN KEY ("ahpWeightSetId") REFERENCES "ahp_weight_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
