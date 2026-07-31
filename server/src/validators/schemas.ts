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
  RiasecType,
  PersonalityTrait,
  AcademicLevel,
  Subject,
} from "@prisma-client";

// ── Reusable enum schemas ─────────────────────────────────────────────────
const genderEnum = z.enum(Object.values(Gender) as [string, ...string[]]);
const ssLevelEnum = z.enum(Object.values(SSLevel) as [string, ...string[]]);
const academicStreamEnum = z.enum(Object.values(AcademicStream) as [string, ...string[]]);
const riasecTypeEnum = z.enum(Object.values(RiasecType) as [string, ...string[]]);
const personalityTraitEnum = z.enum(Object.values(PersonalityTrait) as [string, ...string[]]);
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
  // FIX (Bug 2.1): schoolName is accepted from the client form. The Student
  // model has no direct schoolName column (it uses a schoolId FK), so we
  // store it as a prefixed careerAspiration note if the field is present
  // and careerAspiration is not separately supplied. The controller handles
  // the merge logic. This way the field is not silently stripped by Zod.
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
  studentSubjects: z
    .array(subjectEnum)
    .min(1, "studentSubjects must be a non-empty array of Subject enum values"),
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

export {
  genderEnum,
  ssLevelEnum,
  academicStreamEnum,
  riasecTypeEnum,
  personalityTraitEnum,
  academicLevelEnum,
  subjectEnum,
};
