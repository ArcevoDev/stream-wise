// ============================================================================
// Shared client-side types, mirroring the server's API response/request
// shapes. Kept independent of the server package (no cross-package import).
// ============================================================================

export type Stream = "Science" | "Humanities" | "Business";

export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";

export type UserRole = "STUDENT" | "COUNSELOR" | "SCHOOL_ADMIN" | "ADMIN";

/** Synthetic role minted by POST /auth/guest (reviewer browsing session).
 * Guests can only reach the marketing + auth pages; every guarded route
 * (assessment, admin) redirects them to register/login. */
export type GuestRole = "GUEST";

// Academic domain enums mirroring server/prisma/schema.prisma. Kept local so
// the client build has no dependency on `prisma generate` (Vercel static build
// must not need a DATABASE_URL).
export type AcademicStream = "SCIENCE" | "HUMANITIES" | "BUSINESS";

export const AcademicStream = {
  SCIENCE: "SCIENCE",
  HUMANITIES: "HUMANITIES",
  BUSINESS: "BUSINESS",
} as const;

export type AcademicLevel = "JSS3" | "SS1";

export const AcademicLevel = {
  JSS3: "JSS3",
  SS1: "SS1",
} as const;

export type Subject =
  | "ENGLISH_LANGUAGE"
  | "MATHEMATICS"
  | "CITIZENSHIP_AND_HERITAGE"
  | "DIGITAL_TECHNOLOGIES"
  | "BIOLOGY"
  | "CHEMISTRY"
  | "PHYSICS"
  | "FURTHER_MATHEMATICS"
  | "AGRICULTURAL_SCIENCE"
  | "ANIMAL_HUSBANDRY"
  | "TECHNICAL_DRAWING"
  | "FOOD_AND_NUTRITION"
  | "HOME_MANAGEMENT"
  | "LITERATURE_IN_ENGLISH"
  | "GOVERNMENT"
  | "HISTORY"
  | "GEOGRAPHY"
  | "CHRISTIAN_RELIGIOUS_STUDIES"
  | "ISLAMIC_RELIGIOUS_STUDIES"
  | "FRENCH"
  | "YORUBA"
  | "IGBO"
  | "HAUSA"
  | "ARABIC"
  | "VISUAL_ARTS"
  | "MUSIC"
  | "ECONOMICS"
  | "COMMERCE"
  | "FINANCIAL_ACCOUNTING";

export const Subject = {
  ENGLISH_LANGUAGE: "ENGLISH_LANGUAGE",
  MATHEMATICS: "MATHEMATICS",
  CITIZENSHIP_AND_HERITAGE: "CITIZENSHIP_AND_HERITAGE",
  DIGITAL_TECHNOLOGIES: "DIGITAL_TECHNOLOGIES",
  BIOLOGY: "BIOLOGY",
  CHEMISTRY: "CHEMISTRY",
  PHYSICS: "PHYSICS",
  FURTHER_MATHEMATICS: "FURTHER_MATHEMATICS",
  AGRICULTURAL_SCIENCE: "AGRICULTURAL_SCIENCE",
  ANIMAL_HUSBANDRY: "ANIMAL_HUSBANDRY",
  TECHNICAL_DRAWING: "TECHNICAL_DRAWING",
  FOOD_AND_NUTRITION: "FOOD_AND_NUTRITION",
  HOME_MANAGEMENT: "HOME_MANAGEMENT",
  LITERATURE_IN_ENGLISH: "LITERATURE_IN_ENGLISH",
  GOVERNMENT: "GOVERNMENT",
  HISTORY: "HISTORY",
  GEOGRAPHY: "GEOGRAPHY",
  CHRISTIAN_RELIGIOUS_STUDIES: "CHRISTIAN_RELIGIOUS_STUDIES",
  ISLAMIC_RELIGIOUS_STUDIES: "ISLAMIC_RELIGIOUS_STUDIES",
  FRENCH: "FRENCH",
  YORUBA: "YORUBA",
  IGBO: "IGBO",
  HAUSA: "HAUSA",
  ARABIC: "ARABIC",
  VISUAL_ARTS: "VISUAL_ARTS",
  MUSIC: "MUSIC",
  ECONOMICS: "ECONOMICS",
  COMMERCE: "COMMERCE",
  FINANCIAL_ACCOUNTING: "FINANCIAL_ACCOUNTING",
} as const;

export interface AuthStudent {
  id: string;
  fullName: string;
  email: string;
  role: UserRole | GuestRole;
}

export interface AuthResponse {
  token: string;
  student: AuthStudent;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  gender?: Gender;
  schoolName?: string;
  careerAspiration?: string;
  dateOfBirth?: string;
}

// P0-4a: the four ethics consent points from the landing page. All must be
// true before the assessment flow proceeds.
export interface ConsentPayload {
  consentPoint1: boolean;
  consentPoint2: boolean;
  consentPoint3: boolean;
  consentPoint4: boolean;
  consentVersion?: string;
}

export type RiasecLetter = "R" | "I" | "A" | "S" | "E" | "C";

export interface RiasecQuestion {
  id: number;
  type: RiasecLetter;
  text: string;
}

export type BfiTrait = "O" | "C" | "E" | "A" | "N";

export interface BfiQuestion {
  id: number;
  trait: BfiTrait;
  text: string;
  reverseKeyed: boolean;
}

// FR-02: normalized payload sent to POST /profile/scores
export interface SubjectScoreEntry {
  subject: string;          // Subject enum value e.g. "ENGLISH_LANGUAGE"
  level: "JSS3" | "SS1";
  score: number;
}

export interface AcademicScoresPayload {
  scores: SubjectScoreEntry[];
  tradeSubjectChosen?: string;
}

export interface StreamScore {
  stream: Stream;
  score: number;
}

export interface AhpWeightsResult {
  weights: [number, number, number];
  lambda: number;
  ci: number;
  cr: number;
  consistent: boolean;
  labels: [string, string, string];
}

export interface RecommendationResult {
  ranked: StreamScore[];
  topStream: Stream;
  vScience: number;
  vHumanities: number;
  vBusiness: number;
  confidenceLevel: number;
  guidanceInsight: string;
  ahpWeights: AhpWeightsResult;
  // P0-3b: "assessed" = real BFI profile used; "renormalized" = BFI skipped,
  // personality weight redistributed over the criteria actually present
  // (never fake neutral data injected at full weight).
  personalitySource: "assessed" | "renormalized";
  logId: string;
}

// JambCourse returned by GET /jamb/catalog
export interface JambCourseSubjectRow {
  subject: string;  // Subject enum value
}

export interface JambCourse {
  id: string;
  courseName: string;
  facultyArea: string;
  streamCategory: "SCIENCE" | "HUMANITIES" | "BUSINESS";
  description: string;
  mandatorySubjects: JambCourseSubjectRow[];
}

/**
 * Successful JAMB validation response from POST /jamb/validate.
 * Discriminated union: error-path objects carry `error`, success carries the
 * fields below.
 */
export interface JambValidationSuccess {
  error?: never;
  course: string;
  stream: string;
  mandatorySubjects: string[];
  studentSubjects: string[];
  compliant: boolean;
  missingSubjects: string[];
  message: string;
}

export interface JambValidationError {
  error: string;
  course?: string;
  stream?: string;
  mandatorySubjects?: string[];
  studentSubjects?: string[];
  compliant?: boolean;
  missingSubjects?: string[];
  message?: string;
}

/** Discriminated union. Prefer checking `.error` first. */
export type JambValidationResult = JambValidationSuccess | JambValidationError;

export interface ApiErrorResponse {
  error: string;
  details?: { path: string; message: string }[];
}

// P1-5a: one row from GET /recommend/history (a RecommendationLog).
export interface RecommendationHistoryRow {
  id: string;
  topStream: Stream;
  vScience: number;
  vHumanities: number;
  vBusiness: number;
  confidenceLevel: number;
  guidanceInsight: string;
  algorithmVersion: string;
  ahpWeightSetId: string | null;
  jambRequirementVersion: string | null;
  academicSessionName: string | null;
  generatedAt: string;
}

export interface RecommendationHistoryResponse {
  history: RecommendationHistoryRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Single past recommendation returned by GET /recommend/history/:id. */
export interface RecommendationDetailResponse {
  recommendation: RecommendationResult & {
    generatedAt: string;
  };
}

export interface ClearHistoryResponse {
  deletedCount: number;
}

/**
 * Audit trail identity (GET /admin/audit). `actor` is who performed the
 * action; `student` is the subject (may be null for system/staff-wide ops).
 */
export interface AuditLogRow {
  id: string;
  studentId: string | null;
  actorId: string | null;
  action: string;
  details: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string; role: UserRole | null } | null;
  student: { id: string; fullName: string; email: string } | null;
}

export interface AuditLogsResponse {
  logs: AuditLogRow[];
}

/**
 * Furthest assessment step a student has completed, from GET /auth/progress.
 * Drives resume-step routing after login / on landing.
 */
export type AssessmentStep = "consent" | "scores" | "riasec" | "personality" | "results";

export interface ProgressResponse {
  step: AssessmentStep;
}