// ============================================================================
// Zod request validators.
// SOURCE OF TRUTH: every enum imported directly from the Prisma-generated
// client so enum drift is structurally impossible.
// ============================================================================

import { z } from "zod";
import {
  Gender,
  SSLevel,
  AcademicStream,
  AcademicLevel,
  Subject,
} from "@prisma-client";

// ── Reusable enum schemas ─────────────────────────────────────────────────
const genderEnum = z.enum(Object.values(Gender) as [string, ...string[]]);
const ssLevelEnum = z.enum(Object.values(SSLevel) as [string, ...string[]]);
const academicStreamEnum = z.enum(Object.values(AcademicStream) as [string, ...string[]]);
const academicLevelEnum = z.enum(Object.values(AcademicLevel) as [string, ...string[]]);
const subjectEnum = z.enum(Object.values(Subject) as [string, ...string[]]);

// ── AUTH ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "fullName must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  gender: genderEnum.optional(),
  ssLevel: ssLevelEnum.optional(),
  phoneNumber: z.string().trim().optional(),
  careerAspiration: z.string().trim().optional(),
  // schoolName is accepted from the client form and linked via the schoolId FK
  // (create-or-find a School row). The field stays optional.
  schoolName: z.string().trim().max(200).optional(),
  dateOfBirth: z
    .string()
    .datetime()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── CONSENT (P0-4a, ethics/landing-page spec) ───────────────────────────────
// The landing page lists 4 consent points. Consent is recorded as four
// booleans + a version string so future wording changes don't invalidate
// historical records (same versioning principle as the instrument catalogs).

export const consentSchema = z.object({
  consentPoint1: z.boolean(),
  consentPoint2: z.boolean(),
  consentPoint3: z.boolean(),
  consentPoint4: z.boolean(),
  consentVersion: z.string().default("consent-v1"),
});

export type ConsentInput = z.infer<typeof consentSchema>;

// ── ACADEMIC PROFILE (FR-02) ──────────────────────────────────────────────

const subjectScoreEntrySchema = z.object({
  subject: subjectEnum,
  level: academicLevelEnum,
  score: z.coerce.number().min(0).max(100),
});

export const academicScoresSchema = z.object({
  currentStream: academicStreamEnum,
  scores: z
    .array(subjectScoreEntrySchema)
    .min(1, "At least one subject score is required")
    .refine(
      (scores) => {
        const seen = new Set<string>();
        for (const s of scores) {
          const key = `${s.subject}:${s.level}`;
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      },
      { message: "Duplicate (subject, level) pairs are not allowed in a single submission" }
    ),
  jss3OverallAverage: z.coerce.number().min(0).max(100),
  tradeSubjectChosen: subjectEnum.optional(),
});

// ── RIASEC (FR-03) ────────────────────────────────────────────────────────

const likertItem = z.coerce.number().int().min(1).max(5);

export const riasecSubmitSchema = z.object({
  responses: z.array(likertItem).length(48, "Exactly 48 responses required (values 1-5)"),
});

// ── BFI-20 PERSONALITY ────────────────────────────────────────────────────

export const bfiSubmitSchema = z.object({
  responses: z.array(likertItem).length(20, "Exactly 20 responses required (values 1-5)"),
});

// ── JAMB (FR-08) ──────────────────────────────────────────────────────────

export const jambValidateSchema = z.object({
  jambCourseId: z.string().uuid("jambCourseId must be a valid course id"),
  // P1-3: studentSubjects is OPTIONAL. The server looks up the student's real
  // SubjectScore rows (level = SS1) as the primary source of truth; the
  // client no longer sends hardcoded STREAM_SUBJECTS templates that a student
  // could "pass" with subjects they never took. The field is kept for
  // backwards compatibility (counselor/admin flows may still pass an explicit
  // combination).
  studentSubjects: z
    .array(subjectEnum)
    .min(1, "studentSubjects must be a non-empty array of Subject enum values")
    .optional(),
});

export const jambCatalogQuerySchema = z.object({
  stream: academicStreamEnum.optional(),
  faculty: z.string().trim().optional(),
});

// ── ADMIN (dashboard + oversight) ────────────────────────────────────────────

export const adminStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(2).optional(),
  stream: academicStreamEnum.optional(),
  hasRecommendation: z.enum(["true", "false"]).optional(),
});

export const adminAuditQuerySchema = z.object({
  studentId: z.string().uuid("studentId must be a valid id").optional(),
  action: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ── RECOMMENDATION HISTORY (P1-6: pagination) ─────────────────────────────

export const recommendHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// ── Inferred types ────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AcademicScoresInput = z.infer<typeof academicScoresSchema>;
export type RiasecSubmitInput = z.infer<typeof riasecSubmitSchema>;
export type BfiSubmitInput = z.infer<typeof bfiSubmitSchema>;
export type JambValidateInput = z.infer<typeof jambValidateSchema>;
export type JambCatalogQueryInput = z.infer<typeof jambCatalogQuerySchema>;
export type AdminStudentsQuery = z.infer<typeof adminStudentsQuerySchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
export type RecommendHistoryQuery = z.infer<typeof recommendHistoryQuerySchema>;

export {
  genderEnum,
  ssLevelEnum,
  academicStreamEnum,
  academicLevelEnum,
  subjectEnum,
};
