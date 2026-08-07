-- AlterTable
ALTER TABLE "students" ADD COLUMN     "arcId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_arcId_key" ON "students"("arcId");

-- CreateIndex
CREATE INDEX "students_arcId_idx" ON "students"("arcId");
