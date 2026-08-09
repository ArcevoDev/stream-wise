import type { Request, Response } from "express";
import { createHash } from "node:crypto";
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
import { STREAM_TO_ENUM, ENUM_TO_STREAM, type PersonalityInput } from "@/types/domain.js";
import type { RecommendHistoryQuery } from "@/validators/schemas.js";

const ALGORITHM_VERSION = "ahp-saw-v1.1";
/** Fallback session name when the AcademicSession table is not seeded. */
const FALLBACK_ACADEMIC_SESSION = "2025/2026";

/**
 * Deterministic, key-sorted serialization so the same inputs ALWAYS produce
 * the same fingerprint regardless of object key order or Date formatting.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return `"${value.toISOString()}"`;
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .sort();
  return `{${entries.join(",")}}`;
}

function fingerprintOf(inputsSnapshot: unknown): string {
  return createHash("sha256").update(stableStringify(inputsSnapshot)).digest("hex");
}

/**
 * Build the API-facing recommendation shape from a persisted log row so the
 * same shape is returned whether we create a fresh log or reuse the latest.
 */
function recommendationFromLog(
  log: {
    topStream: AcademicStream;
    vScience: number;
    vHumanities: number;
    vBusiness: number;
    confidenceLevel: number;
    guidanceInsight: string;
    ahpWeightsSnapshot: unknown;
    inputsSnapshot: unknown;
  },
  weightSetMeta?: {
    id: string | null;
    labels: [string, string, string] | null;
    cr: number | null;
  }
) {
  const snapshot = (log.ahpWeightsSnapshot ?? {}) as {
    weights?: number[];
    source?: string;
  };
  const inputs = (log.inputsSnapshot ?? {}) as { personalitySource?: string };
  return {
    // The engine works in "Science" strings; the DB stores the enum. The
    // client renders topStream directly, so bridge back to the Stream type.
    topStream: ENUM_TO_STREAM[log.topStream],
    vScience: log.vScience,
    vHumanities: log.vHumanities,
    vBusiness: log.vBusiness,
    // The client renders a ranked list (StreamRankings); reconstruct it from
    // the persisted Vᵢ values so a stored row displays identically to a
    // freshly computed one.
    ranked: [
      { stream: "Science", score: log.vScience },
      { stream: "Humanities", score: log.vHumanities },
      { stream: "Business", score: log.vBusiness },
    ].sort((a, b) => b.score - a.score),
    confidenceLevel: log.confidenceLevel,
    guidanceInsight: log.guidanceInsight,
    ahpWeights: {
      weights: snapshot.weights ?? [0.540, 0.297, 0.163],
      weightSetId: weightSetMeta?.id ?? null,
      labels: weightSetMeta?.labels ?? ["Academic Performance", "Vocational Interest (RIASEC)", "Personality Traits"],
      cr: weightSetMeta?.cr ?? 0.007,
      consistent: true,
    },
    personalitySource: inputs.personalitySource ?? "renormalized",
  };
}

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

  // --- Idempotent recommendation (DB-level) --------------------------------
  // Two concurrent POSTs (React StrictMode double-effect) must never stack
  // two identical history rows. The SHA-256 fingerprint of the exact inputs
  // is unique in the DB : the first upsert wins, the second updates the
  // same row in place instead of inserting a duplicate. Re-visiting /results
  // with unchanged inputs also reuses the existing row.
  const inputsSnapshot = {
    academic,
    academicByStream,
    riasec,
    personality,
    personalitySource,
    sawWeights,
  };
  const inputFingerprint = fingerprintOf(inputsSnapshot);
  const latestLog = await prisma.recommendationLog.findFirst({
    where: { studentId },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      topStream: true,
      vScience: true,
      vHumanities: true,
      vBusiness: true,
      confidenceLevel: true,
      guidanceInsight: true,
      ahpWeightsSnapshot: true,
      inputsSnapshot: true,
      inputFingerprint: true,
    },
  });
  const latestSnapshot = (latestLog?.inputsSnapshot ?? null) as unknown as typeof inputsSnapshot | null;
  if (latestLog && latestSnapshot && fingerprintOf(latestSnapshot) === inputFingerprint) {
    res.json({
      // "reused": the student already has this exact recommendation. Lets the
      // client skip the "Recommendation ready" toast on re-visits.
      generated: false,
      recommendation: {
        ...recommendationFromLog(latestLog, {
          id: weightSetId,
          labels: activeWeightSet
            ? (activeWeightSet.criterionLabels as [string, string, string])
            : null,
          cr: activeWeightSet?.cr ?? null,
        }),
        contributionBreakdown: explainRecommendation(sawResult, sawWeights),
        logId: latestLog.id,
      },
    });
    return;
  }

  // --- P0-2d: per-criterion contribution breakdown (explainability) ---
  const contributionBreakdown = explainRecommendation(sawResult, sawWeights);

  const guidanceInsight = generateGuidanceInsight(
    sawResult.topStream,
    riasec.summaryCode,
    sawResult.confidenceLevel,
    academicByStream[STREAM_TO_ENUM[sawResult.topStream]],
    sawResult
  );

  const data = {
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
    inputsSnapshot: JSON.parse(JSON.stringify(inputsSnapshot)),
    inputFingerprint,
  };

  // Atomic create-or-reuse. A concurrent identical POST that slipped past the
  // findFirst above now hits the unique inputFingerprint index and is skipped
  // (count = 0) instead of inserting a duplicate row.
  const { count } = await prisma.recommendationLog.createMany({
    data,
    skipDuplicates: true,
  });
  const log = await prisma.recommendationLog.findFirst({
    where: { inputFingerprint },
    orderBy: { generatedAt: "desc" },
  });

  if (!log) {
    res.status(500).json({ error: "Recommendation could not be persisted." });
    return;
  }

  // P1-2: audit the recommendation generation (only when we actually created).
  if (count > 0) {
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
  }

  res.json({
    generated: true,
    recommendation: {
      ...recommendationFromLog(log, {
        id: weightSetId,
        labels: activeWeightSet
          ? (activeWeightSet.criterionLabels as [string, string, string])
          : null,
        cr: activeWeightSet?.cr ?? null,
      }),
      contributionBreakdown,
      logId: log.id,
    },
  });
});

export const getRecommendationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const log = await prisma.recommendationLog.findFirst({
    where: { id, studentId: req.student!.id },
    select: {
      id: true,
      topStream: true,
      vScience: true,
      vHumanities: true,
      vBusiness: true,
      confidenceLevel: true,
      guidanceInsight: true,
      ahpWeightsSnapshot: true,
      inputsSnapshot: true,
      ahpWeightSetId: true,
      generatedAt: true,
    },
  });

  if (!log) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  // Resolve the weight-set labels/CR the row was generated under, falling
  // back to the row's own snapshot so old rows stay self-describing.
  const weightSet = log.ahpWeightSetId
    ? await prisma.ahpWeightSet.findUnique({ where: { id: log.ahpWeightSetId } })
    : null;

  res.json({
    recommendation: {
      ...recommendationFromLog(log, {
        id: log.ahpWeightSetId,
        labels: weightSet
          ? (weightSet.criterionLabels as [string, string, string])
          : null,
        cr: weightSet?.cr ?? null,
      }),
      logId: log.id,
      generatedAt: log.generatedAt,
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

/** Delete every RecommendationLog row for the current student. Raw assessment
 * data (SubjectScore / RiasecResponse / BfiResponse) is deliberately kept so
 * the student can retake the assessment and generate fresh results. */
export const clearHistory = asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.recommendationLog.deleteMany({
    where: { studentId: req.student!.id },
  });

  await writeAudit(req, {
    action: "RECOMMENDATION_HISTORY_CLEARED",
    studentId: req.student!.id,
    metadata: { deletedCount: count },
  });

  res.json({ deletedCount: count });
});
