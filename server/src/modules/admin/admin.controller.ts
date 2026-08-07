import type { Request, Response } from "express";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { AcademicStream } from "@prisma-client";
import { rescoreBfi, rescoreRiasec } from "@/engine/index.js";
import type { AdminStudentsQuery, AdminAuditQuery } from "@/validators/schemas.js";

/**
 * GET /api/admin/stats. Headline KPIs + the completion funnel.
 * The funnel counts how many registered students reached each milestone:
 * registered → scores → RIASEC → BFI → recommendation.
 */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalStudents, totalRecommendations, totalJambValidations, totalCourses, funnelRows] =
    await Promise.all([
      prisma.student.count(),
      prisma.recommendationLog.count(),
      prisma.jambValidation.count(),
      prisma.jambCourse.count(),
      prisma.student.findMany({
        select: {
          id: true,
          academicProfile: { select: { id: true } },
          riasecProfile: { select: { id: true } },
          personalityProfile: { select: { id: true } },
          recommendations: { select: { id: true }, take: 1 },
        },
      }),
    ]);

  // Registered base = totalStudents; each milestone is a count of distinct
  // students who have the corresponding profile/log.
  let scores = 0;
  let riasec = 0;
  let bfi = 0;
  let recommended = 0;
  for (const s of funnelRows) {
    if (s.academicProfile) scores++;
    if (s.riasecProfile) riasec++;
    if (s.personalityProfile) bfi++;
    if (s.recommendations.length > 0) recommended++;
  }

  res.json({
    stats: {
      totalStudents,
      totalRecommendations,
      totalJambValidations,
      totalCourses,
      funnel: {
        registered: totalStudents,
        scores,
        riasec,
        bfi,
        recommended,
      },
    },
  });
});

/**
 * GET /api/admin/analytics. Distributions for the dashboard charts.
 *  - streamDistribution: recommended topStream counts
 *  - confidenceDistribution: confidenceLevel bucketed into 10-point bins
 *  - registrationsByMonth: student registrations per calendar month
 *  - topCourses: most-validated JAMB courses with compliance rate
 *  - avgAcademicPerStream: mean weightedAcademicScore per reported stream
 */
export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const [streamLogs, allRecommendations, registrations, topJambRows, avgScores] = await Promise.all([
    prisma.recommendationLog.groupBy({
      by: ["topStream"],
      _count: { _all: true },
    }),
    prisma.recommendationLog.findMany({ select: { confidenceLevel: true } }),
    prisma.student.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.jambValidation.groupBy({
      by: ["jambCourseId", "isCompliant"],
      _count: { _all: true },
    }),
    prisma.academicProfile.groupBy({
      by: ["currentStream"],
      _avg: { weightedAcademicScore: true },
    }),
  ]);

  // Stream distribution. Align to the AcademicStream enum, default 0.
  const streamDistribution = {
    [AcademicStream.SCIENCE]: 0,
    [AcademicStream.HUMANITIES]: 0,
    [AcademicStream.BUSINESS]: 0,
  };
  for (const row of streamLogs) {
    streamDistribution[row.topStream] = row._count._all;
  }

  // Confidence histogram. 10-point bins 0-9 .. 90-100.
  const bins = Array.from({ length: 10 }, () => 0);
  for (const r of allRecommendations) {
    const bucket = Math.min(9, Math.floor(r.confidenceLevel / 10));
    bins[bucket] = (bins[bucket] ?? 0) + 1;
  }
  const confidenceDistribution = bins.map((count, i) => ({
    bin: `${i * 10}-${i * 10 + 9}`,
    count,
  }));

  // Registrations per month (YYYY-MM). From first to latest registration.
  const byMonth = new Map<string, number>();
  for (const s of registrations) {
    const key = s.createdAt.toISOString().slice(0, 7); // YYYY-MM
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const registrationsByMonth = Array.from(byMonth.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  // Top JAMB courses with compliance rate. Rows are grouped by
  // (course, isCompliant). Roll up per course, then sort by total count.
  const perCourse = new Map<string, { total: number; compliant: number }>();
  for (const row of topJambRows) {
    const count = row._count._all ?? 0;
    const entry = perCourse.get(row.jambCourseId) ?? { total: 0, compliant: 0 };
    entry.total += count;
    if (row.isCompliant) entry.compliant += count;
    perCourse.set(row.jambCourseId, entry);
  }
  const topCourseIds = Array.from(perCourse.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id]) => id);
  const courses = topCourseIds.length
    ? await prisma.jambCourse.findMany({
        where: { id: { in: topCourseIds } },
        select: { id: true, courseName: true, facultyArea: true },
      })
    : [];
  const courseNameById = new Map(courses.map((c) => [c.id, c]));
  const topCourses = topCourseIds.map((id) => {
    const course = courseNameById.get(id);
    const { total, compliant } = perCourse.get(id)!;
    return {
      courseId: id,
      courseName: course?.courseName ?? "Unknown course",
      facultyArea: course?.facultyArea ?? "",
      validationCount: total,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
    };
  });

  // Average weighted academic score per reported stream.
  const avgAcademicPerStream = avgScores
    .filter((r) => r.currentStream !== null)
    .map((r) => ({
      stream: r.currentStream,
      avgWeightedScore: r._avg.weightedAcademicScore ?? 0,
    }));

  res.json({ analytics: { streamDistribution, confidenceDistribution, registrationsByMonth, topCourses, avgAcademicPerStream } });
});

/**
 * GET /api/admin/students?page=&pageSize=&search=&stream=&hasRecommendation=
 * Paginated, searchable student list for the dashboard table.
 */
export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search, stream, hasRecommendation } = req.query as unknown as AdminStudentsQuery;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (stream) {
    where.academicProfile = { is: { currentStream: stream } };
  }
  if (hasRecommendation === "true") {
    where.recommendations = { some: {} };
  } else if (hasRecommendation === "false") {
    where.recommendations = { none: {} };
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        ssLevel: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        academicProfile: { select: { currentStream: true, weightedAcademicScore: true } },
        recommendations: { select: { id: true }, take: 1 },
      },
    }),
  ]);

  const list = students.map((s) => ({
    ...s,
    hasRecommendation: s.recommendations.length > 0,
    currentStream: s.academicProfile?.currentStream ?? null,
    weightedAcademicScore: s.academicProfile?.weightedAcademicScore ?? null,
    recommendations: undefined,
    academicProfile: undefined,
  }));

  res.json({
    students: list,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

/**
 * GET /api/admin/students/:id. Full drill-down view for the admin detail page:
 * profile, academic, RIASEC/BFI, recommendation history, JAMB validations.
 */
export const getStudentDetail = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      gender: true,
      ssLevel: true,
      phoneNumber: true,
      careerAspiration: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      school: { select: { id: true, name: true } },
      counselor: { select: { id: true, fullName: true } },
      academicProfile: true,
      subjectScores: {
        orderBy: [{ level: "asc" }, { subject: "asc" }],
      },
      riasecProfile: true,
      personalityProfile: true,
      recommendations: {
        orderBy: { generatedAt: "desc" },
        take: 10,
      },
      jambValidations: {
        orderBy: { validatedAt: "desc" },
        take: 10,
        include: { jambCourse: { select: { id: true, courseName: true, facultyArea: true } } },
      },
    },
  });

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({ student });
});

/**
 * GET /api/admin/audit?studentId=&action=&limit=. Recent audit trail.
 * Rows are written by services/audit.ts (writeAudit) on the six key domain
 * actions: LOGIN, SCORES_SUBMITTED, RIASEC_COMPLETED, BFI_COMPLETED,
 * RECOMMENDATION_GENERATED, JAMB_VALIDATED.
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, action, limit = 50 } = req.query as unknown as AdminAuditQuery;

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ logs });
});

/**
 * GET /api/admin/export/csv. Full student dataset for the thesis appendix.
 * Downloads a UTF-8 CSV with one row per student. Profile values are joined
 * in so the sheet is usable standalone (no IDs to look up).
 */
export const exportCsv = asyncHandler(async (_req: Request, res: Response) => {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true,
      email: true,
      gender: true,
      ssLevel: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      careerAspiration: true,
      createdAt: true,
      lastLoginAt: true,
      academicProfile: { select: { currentStream: true, weightedAcademicScore: true } },
      riasecProfile: { select: { summaryCode: true } },
      recommendations: { select: { topStream: true, confidenceLevel: true }, take: 1 },
    },
  });

  const escapeCsv = (value: unknown): string => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = [
    "fullName",
    "email",
    "gender",
    "ssLevel",
    "phoneNumber",
    "role",
    "isActive",
    "careerAspiration",
    "createdAt",
    "lastLoginAt",
    "currentStream",
    "weightedAcademicScore",
    "riasecSummaryCode",
    "recommendedStream",
    "confidenceLevel",
  ];

  const rows = students.map((s) =>
    [
      s.fullName,
      s.email,
      s.gender,
      s.ssLevel,
      s.phoneNumber,
      s.role,
      s.isActive,
      s.careerAspiration,
      s.createdAt.toISOString(),
      s.lastLoginAt?.toISOString() ?? "",
      s.academicProfile?.currentStream ?? "",
      s.academicProfile?.weightedAcademicScore ?? "",
      s.riasecProfile?.summaryCode ?? "",
      s.recommendations[0]?.topStream ?? "",
      s.recommendations[0]?.confidenceLevel ?? "",
    ]
      .map(escapeCsv)
      .join(",")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dss-students-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header.join(","), ...rows].join("\n"));
});

/**
 * POST /api/admin/rescore/:studentId. P0-5c validation-study entry point.
 * Recomputes a student's RIASEC + BFI profiles from the RAW response rows
 * via the pure engine helpers, without touching stored profile rows. The
 * thesis 100-profile simulation (§3.8) uses this to prove scoring stability.
 *
 * Response contains the recomputed profiles plus whether the recomputed
 * values differ from the currently-stored profile (drift flag).
 */
export const rescoreStudent = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const [riasecRows, bfiRows, riasecProfile, personalityProfile] = await Promise.all([
    prisma.riasecResponse.findMany({
      where: { studentId },
      orderBy: { questionId: "asc" },
    }),
    prisma.bfiResponse.findMany({
      where: { studentId },
      orderBy: { questionId: "asc" },
    }),
    prisma.riasecProfile.findUnique({ where: { studentId } }),
    prisma.personalityProfile.findUnique({ where: { studentId } }),
  ]);

  const missing: string[] = [];
  if (riasecRows.length === 0) missing.push("riasec");
  if (bfiRows.length === 0) missing.push("bfi");

  if (missing.length > 0) {
    res.status(404).json({
      error: `No raw responses found for student ${studentId} (${missing.join(", ")}).`,
    });
    return;
  }

  // Recompute from raw rows. A stored instrumentVersion that predates the
  // version check will throw. Surface it as a 409 so the study runner can
  // flag legacy data rather than silently rescoring with the wrong key.
  let riasecScores;
  let bfiScores;
  try {
    riasecScores = rescoreRiasec(
      riasecRows.map((r) => ({ questionId: r.questionId, value: r.value, instrumentVersion: r.instrumentVersion }))
    );
    bfiScores = rescoreBfi(
      bfiRows.map((r) => ({ questionId: r.questionId, value: r.value, reverseKeyed: r.reverseKeyed, instrumentVersion: r.instrumentVersion }))
    );
  } catch (err) {
    res.status(409).json({ error: err instanceof Error ? err.message : String(err) });
    return;
  }

  const riasecDrift =
    riasecProfile &&
    (Math.abs(riasecScores.scienceAffinity - riasecProfile.scienceAffinity) > 0.05 ||
      Math.abs(riasecScores.humanitiesAffinity - riasecProfile.humanitiesAffinity) > 0.05 ||
      Math.abs(riasecScores.businessAffinity - riasecProfile.businessAffinity) > 0.05);

  const bfiDrift =
    personalityProfile &&
    (Math.abs(bfiScores.opennessScore - personalityProfile.opennessScore) > 0.05 ||
      Math.abs(bfiScores.conscientiousnessScore - personalityProfile.conscientiousnessScore) > 0.05 ||
      Math.abs(bfiScores.extraversionScore - personalityProfile.extraversionScore) > 0.05 ||
      Math.abs(bfiScores.agreeablenessScore - personalityProfile.agreeablenessScore) > 0.05 ||
      // P0-3e: stability is derived (100 − neuroticism), so a neuroticism
      // drift is implicitly covered; kept explicit for the study record.
      Math.abs(bfiScores.neuroticismScore - personalityProfile.neuroticismScore) > 0.05);

  res.json({
    studentId,
    recomputed: { riasec: riasecScores, bfi: bfiScores },
    drift: { riasec: riasecDrift ?? null, bfi: bfiDrift ?? null },
    note: "Recomputed from raw response rows. Stored profiles were NOT modified.",
  });
});
