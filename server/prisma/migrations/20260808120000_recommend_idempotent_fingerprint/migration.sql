-- Idempotent recommendation generation : a deterministic SHA-256 fingerprint
-- of the exact inputs is stored per log row and made UNIQUE at the DB level.
-- Concurrent POST /api/recommend calls (e.g. React StrictMode double-effects)
-- can no longer race past the controller's check-then-create and stack two
-- identical history rows : the first insert wins, duplicates are skipped.
--
-- Existing rows stay valid : the column is nullable and legacy rows are simply
-- not deduplicated against (their fingerprint is backfilled lazily by the
-- controller's stableStringify on the stored inputsSnapshot when reused).

-- AlterTable
ALTER TABLE "recommendation_logs" ADD COLUMN     "inputFingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_logs_inputFingerprint_key" ON "recommendation_logs"("inputFingerprint");
