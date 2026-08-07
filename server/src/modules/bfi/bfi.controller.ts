import type { Request, Response } from "express";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { writeAudit } from "@/services/audit.js";
import { computeBFI, BFI_QUESTIONS } from "@/engine/bfi.js";
import type { BfiSubmitInput } from "@/validators/schemas.js";

/**
 * P0-5b: instrument version stamped on every raw response so a future
 * item-set change cannot corrupt historical responses. Must match the
 * schema default "bfi-v1".
 */
const INSTRUMENT_VERSION = "bfi-v1";

export function getBfiQuestions(_req: Request, res: Response): void {
  res.json({ questions: BFI_QUESTIONS, total: BFI_QUESTIONS.length });
}

export const submitBFI = asyncHandler<Request<Record<string, never>, unknown, BfiSubmitInput>>(
  async (req, res: Response) => {
    const studentId = req.student!.id;
    const { responses } = req.body;

    const result = computeBFI(responses);

    const profile = await prisma.personalityProfile.upsert({
      where: { studentId },
      update: { ...result },
      create: { studentId, ...result },
    });

    // Persist raw per-item responses for audit/re-scoring.
    // P0-5b: instrumentVersion stamped explicitly on every row.
    // Generous timeout: 44 upserts must all start before Prisma's 5s default
    // or the whole transaction fails with P2028 under pool contention.
    await prisma.$transaction(
      responses.map((value, idx) =>
        prisma.bfiResponse.upsert({
          where: { studentId_questionId: { studentId, questionId: BFI_QUESTIONS[idx]!.id } },
          update: { value, trait: BFI_QUESTIONS[idx]!.trait, reverseKeyed: BFI_QUESTIONS[idx]!.reverseKeyed, instrumentVersion: INSTRUMENT_VERSION },
          create: {
            studentId,
            questionId: BFI_QUESTIONS[idx]!.id,
            trait: BFI_QUESTIONS[idx]!.trait,
            reverseKeyed: BFI_QUESTIONS[idx]!.reverseKeyed,
            value,
            instrumentVersion: INSTRUMENT_VERSION,
          },
        })
      ),
      { timeout: 15_000 }
    );

    // P1-2: audit the BFI completion.
    await writeAudit(req, {
      action: "BFI_COMPLETED",
      studentId,
      metadata: {
        instrumentVersion: INSTRUMENT_VERSION,
        opennessScore: result.opennessScore,
        conscientiousnessScore: result.conscientiousnessScore,
        extraversionScore: result.extraversionScore,
        agreeablenessScore: result.agreeablenessScore,
        neuroticismScore: result.neuroticismScore,
        emotionalStabilityScore: result.emotionalStabilityScore,
      },
    });

    res.json({ message: "Personality (BFI) profile saved", profile });
  }
);

export const getBFI = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.personalityProfile.findUnique({ where: { studentId: req.student!.id } });
  if (!profile) {
    res.status(404).json({ error: "Personality profile not found. Please complete the BFI assessment first." });
    return;
  }
  res.json({ profile });
});