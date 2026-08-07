// ============================================================================
// Shared client-side types, mirroring the server's API response/request
// shapes. Kept independent of the server package (no cross-package import).
// ============================================================================

export type Stream = "Science" | "Humanities" | "Business";

export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";

export type UserRole = "STUDENT" | "COUNSELOR" | "SCHOOL_ADMIN" | "ADMIN";

export interface AuthStudent {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
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