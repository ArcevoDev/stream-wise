import type { Request, Response } from "express";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { writeAudit } from "@/services/audit.js";
import { computeRIASEC, RIASEC_QUESTIONS } from "@/engine/riasec.js";
import type { RiasecSubmitInput } from "@/validators/schemas.js";

/**
 * P0-5b: instrument version stamped on every raw response so a future
 * item-set change cannot corrupt historical responses. Must match the
 * schema default "riasec-v1".
 */
const INSTRUMENT_VERSION = "riasec-v1";

export function getQuestions(_req: Request, res: Response): void {
  res.json({ questions: RIASEC_QUESTIONS, total: RIASEC_QUESTIONS.length });
}

export const submitRIASEC = asyncHandler<Request<Record<string, never>, unknown, RiasecSubmitInput>>(
  async (req, res: Response) => {
    const studentId = req.student!.id;
    const { responses } = req.body;

    const result = computeRIASEC(responses);

    const profile = await prisma.riasecProfile.upsert({
      where: { studentId },
      update: { ...result },
      create: { studentId, ...result },
    });

    // Persist raw per-item responses for audit/re-scoring (upsert each item).
    // P0-5b: instrumentVersion stamped explicitly on every row.
    // Generous timeout: 42 upserts must all start before Prisma's 5s default
    // or the whole transaction fails with P2028 under pool contention.
    await prisma.$transaction(
      responses.map((value, idx) =>
        prisma.riasecResponse.upsert({
          where: { studentId_questionId: { studentId, questionId: RIASEC_QUESTIONS[idx]!.id } },
          update: { value, type: RIASEC_QUESTIONS[idx]!.type, instrumentVersion: INSTRUMENT_VERSION },
          create: {
            studentId,
            questionId: RIASEC_QUESTIONS[idx]!.id,
            type: RIASEC_QUESTIONS[idx]!.type,
            value,
            instrumentVersion: INSTRUMENT_VERSION,
          },
        })
      ),
      { timeout: 15_000 }
    );

    // P1-2: audit the RIASEC completion.
    await writeAudit(req, {
      action: "RIASEC_COMPLETED",
      studentId,
      metadata: {
        summaryCode: result.summaryCode,
        instrumentVersion: INSTRUMENT_VERSION,
        scienceAffinity: result.scienceAffinity,
        humanitiesAffinity: result.humanitiesAffinity,
        businessAffinity: result.businessAffinity,
      },
    });

    res.json({ message: "RIASEC profile saved", profile });
  }
);

export const getRIASEC = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.riasecProfile.findUnique({ where: { studentId: req.student!.id } });
  if (!profile) {
    res.status(404).json({ error: "RIASEC profile not found. Please complete the assessment first." });
    return;
  }
  res.json({ profile });
});