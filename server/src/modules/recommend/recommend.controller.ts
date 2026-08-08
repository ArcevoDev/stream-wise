import type { Request, Response } from "express";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { writeAudit } from "@/services/audit.js";
import {
  computeSAW,
  explainRecommendation,
  generateGuidanceInsight,
  DEFAULT_STREAM_TRAIT_MAPPING,
} from "@/engine/index.js";
import { AcademicLevel, AcademicStream, Subject } from "@prisma-client";
import { STREAM_TO_ENUM, type PersonalityInput } from "@/types/domain.js";
import type { RecommendHistoryQuery } from "@/validators/schemas.js";

const ALGORITHM_VERSION = "ahp-saw-v1.1";
/** Fallback session name when the AcademicSession table is not seeded. */
const FALLBACK_ACADEMIC_SESSION = "2025/2026";

/**
 * P0-3b: students who reach recommendation generation WITHOUT a BFI-20
 * profile no longer get silently injected 60/60/60/60 fake data at full
 * weight. Instead the Personality criterion is renormalised OUT of the
 * weight vector (weights redistribute over the criteria actually present),
 * and the result is flagged personalitySource: "renormalized". A student
 * who skipped BFI still gets a recommendation. But it is computed from
 * their real data only, never from fabricated neutral inputs.
 */
function renormalizeWithoutPersonality(weights: [number, number, number]): [number, number, number] {
  const [academic, riasec] = weights;
  const total = academic + riasec;
  if (total <= 0) return [0.5, 0.5, 0];
  return [academic / total, riasec / total, 0];
}

export const getRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.student!.id;

  // P0-4a: server-side consent gate. The recommendation (and the study's
  // evaluation logging) requires a granted consent record. The client gates
  // on consentRequired from /auth/profile; this is the enforcement backstop.
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { consentStatus: true },
  });
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  if (student.consentStatus !== "granted") {
    res.status(403).json({
      error: "Consent required",
      details: "You must review and agree to the informed consent points before a recommendation can be generated.",
    });
    return;
  }

  const academic = await prisma.academicProfile.findUnique({ where: { studentId } });
  if (!academic) {
    res.status(400).json({ error: "Academic scores not found. Please complete Step 1 first." });
    return;
  }

  const riasec = await prisma.riasecProfile.findUnique({ where: { studentId } });
  if (!riasec) {
    res.status(400).json({ error: "RIASEC assessment not found. Please complete Step 2 first." });
    return;
  }

  // --- P0-1c: consume weights from the versioned AhpWeightSet table ---
  // The active weight set is the source of truth; the engine NEVER imports
  // module-level weight constants anymore.
  const activeWeightSet = await prisma.ahpWeightSet.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const weights: [number, number, number] = activeWeightSet
    ? (activeWeightSet.weights as unknown as [number, number, number])
    : [0.540, 0.297, 0.163]; // hardcoded fallback ONLY if seeding was skipped (dev safety net)
  const weightSetId = activeWeightSet?.id ?? null;

  // --- P0-3a: per-stream academic scoring (thesis §3.5.3) ---
  // Each stream's academic score = jss3Average*0.4 + that stream's SS1
  // subject average *0.6. Core subjects (English/Maths) feed every stream;
  // stream-specific SS1 electives differentiate the criterion.
  const ss1Scores = await prisma.subjectScore.findMany({
    where: { studentId, level: AcademicLevel.SS1 },
  });

  // Subject → streamCategory lookup from the versioned catalog (P0-1a).
  // Falls back to a conservative mapping if the catalog is not seeded.
  const activeSession =
    (await prisma.academicSession.findFirst({ where: { isActive: true } })) ??
    // Dev fallback: if no session is flagged active (e.g. seed skipped),
    // resolve the latest seeded session by name.
    (await prisma.academicSession.findFirst({
      where: { name: FALLBACK_ACADEMIC_SESSION },
    }));
  const academicSessionName = activeSession?.name ?? FALLBACK_ACADEMIC_SESSION;
  const catalogRows = await prisma.subjectCatalog.findMany({
    where: { academicSession: { name: academicSessionName } },
  });
  const subjectStreamMap = new Map<string, AcademicStream>();
  for (const row of catalogRows) subjectStreamMap.set(row.subject, row.streamCategory ?? AcademicStream.SCIENCE);

  const ss1ByStream: Record<AcademicStream, number[]> = {
    [AcademicStream.SCIENCE]: [],
    [AcademicStream.HUMANITIES]: [],
    [AcademicStream.BUSINESS]: [],
  };

  // Core (English, Maths) contributes to ALL streams; non-core rows route to
  // their catalog stream. If the catalog has no row for a subject, route by
  // a sensible default (a subject belongs to the stream its name suggests.
  // Approximated via the existing enum; see README).
  const CORE_SUBJECTS: Subject[] = [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS];
  for (const row of ss1Scores) {
    if (CORE_SUBJECTS.includes(row.subject)) {
      ss1ByStream[AcademicStream.SCIENCE]!.push(row.score);
      ss1ByStream[AcademicStream.HUMANITIES]!.push(row.score);
      ss1ByStream[AcademicStream.BUSINESS]!.push(row.score);
    } else {
      const stream = subjectStreamMap.get(row.subject);
      if (stream) ss1ByStream[stream]!.push(row.score);
    }
  }

  const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const academicByStream: Record<AcademicStream, number> = {
    [AcademicStream.SCIENCE]: parseFloat((academic.jss3Average * 0.4 + avg(ss1ByStream[AcademicStream.SCIENCE]) * 0.6).toFixed(2)),
    [AcademicStream.HUMANITIES]: parseFloat((academic.jss3Average * 0.4 + avg(ss1ByStream[AcademicStream.HUMANITIES]) * 0.6).toFixed(2)),
    [AcademicStream.BUSINESS]: parseFloat((academic.jss3Average * 0.4 + avg(ss1ByStream[AcademicStream.BUSINESS]) * 0.6).toFixed(2)),
  };

  // --- Personality: real profile OR renormalized weights (never fake data) ---
  const personalityProfile = await prisma.personalityProfile.findUnique({ where: { studentId } });
  const personalitySource: "assessed" | "renormalized" = personalityProfile ? "assessed" : "renormalized";
  const personality: PersonalityInput | undefined = personalityProfile
    ? {
        opennessScore: personalityProfile.opennessScore,
        conscientiousnessScore: personalityProfile.conscientiousnessScore,
        extraversionScore: personalityProfile.extraversionScore,
        agreeablenessScore: personalityProfile.agreeablenessScore,
        // P0-3e: neuroticism included as inverted Emotional Stability (5-factor).
        // The value is persisted on the profile at assessment time (bfi.controller),
        // so historical recommendations use the exact stability recorded then.
        emotionalStabilityScore: personalityProfile.emotionalStabilityScore,
      }
    : undefined;

  const sawWeights = personality ? weights : renormalizeWithoutPersonality(weights);

  const sawResult = computeSAW(
    {
      scienceScore: academicByStream[AcademicStream.SCIENCE],
      humanitiesScore: academicByStream[AcademicStream.HUMANITIES],
      businessScore: academicByStream[AcademicStream.BUSINESS],
    },
    {
      scienceAffinity: riasec.scienceAffinity,
      humanitiesAffinity: riasec.humanitiesAffinity,
      businessAffinity: riasec.businessAffinity,
    },
    personality ?? {
      // computeSAW requires a PersonalityInput shape; with a zero personality
      // weight the values are mathematically irrelevant. Use explicit zeros
      // so there is no fake data anywhere.
      opennessScore: 0,
      conscientiousnessScore: 0,
      extraversionScore: 0,
      agreeablenessScore: 0,
      emotionalStabilityScore: 0,
    },
    sawWeights,
    DEFAULT_STREAM_TRAIT_MAPPING
  );

  // --- P0-2d: per-criterion contribution breakdown (explainability) ---
  const contributionBreakdown = explainRecommendation(sawResult, sawWeights);

  const guidanceInsight = generateGuidanceInsight(
    sawResult.topStream,
    riasec.summaryCode,
    sawResult.confidenceLevel,
    academicByStream[STREAM_TO_ENUM[sawResult.topStream]],
    sawResult
  );

  const log = await prisma.recommendationLog.create({
    data: {
      studentId,
      topStream: STREAM_TO_ENUM[sawResult.topStream],
      vScience: sawResult.vScience,
      vHumanities: sawResult.vHumanities,
      vBusiness: sawResult.vBusiness,
      confidenceLevel: sawResult.confidenceLevel,
      guidanceInsight,
      algorithmVersion: ALGORITHM_VERSION,
      ahpWeightsSnapshot: JSON.parse(JSON.stringify({ weights: sawWeights, source: weightSetId ? "weight-set" : "fallback" })),
      // P0-5a: immutable FK to the exact weight set used.
      ahpWeightSetId: weightSetId,
      // JAMB cycle the recommendation was generated under (matches
      // JambCourse.admissionCycle + the log's academicSessionName). The
      // AHP weight-set version lives on ahpWeightSetId's row instead.
      jambRequirementVersion: academicSessionName,
      academicSessionName,
      // Closes the Explainability Gap inside the audit logs
      inputsSnapshot: JSON.parse(
        JSON.stringify({ academic, academicByStream, riasec, personality, personalitySource, sawWeights })
      ),
    },
  });

  // P1-2: audit the recommendation generation.
  await writeAudit(req, {
    action: "RECOMMENDATION_GENERATED",
    studentId,
    metadata: {
      topStream: STREAM_TO_ENUM[sawResult.topStream],
      confidenceLevel: sawResult.confidenceLevel,
      personalitySource,
      weightSetId,
      logId: log.id,
    },
  });

  res.json({
    recommendation: {
      ...sawResult,
      guidanceInsight,
      contributionBreakdown,
      // P0-1c: expose the full weight-set metadata for the transparency UI
      // (labels + CR). Falls back to engine defaults if seeding was skipped.
      ahpWeights: {
        weights: sawWeights,
        weightSetId,
        labels: activeWeightSet
          ? (activeWeightSet.criterionLabels as [string, string, string])
          : ["Academic Performance", "Vocational Interest (RIASEC)", "Personality Traits"],
        cr: activeWeightSet?.cr ?? 0.007,
        consistent: true,
      },
      personalitySource,
      logId: log.id,
    },
  });
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 10 } = req.query as unknown as RecommendHistoryQuery;

  const [total, logs] = await Promise.all([
    prisma.recommendationLog.count({ where: { studentId: req.student!.id } }),
    prisma.recommendationLog.findMany({
      where: { studentId: req.student!.id },
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    history: logs,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
