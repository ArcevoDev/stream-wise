// ============================================================================
// Shared domain types for the AHP-SAW decision engine and related modules.
// Centralising these avoids re-declaring the same shapes in every engine
// file and keeps controller <-> engine contracts explicit.
//
// These are pure computation-layer types — deliberately NOT copies of
// Prisma model shapes (those are imported from the generated client
// directly wherever needed). This file only holds the intermediate shapes
// the AHP/SAW/RIASEC/BFI math passes between functions.
// ============================================================================

export type Stream = "Science" | "Humanities" | "Business";

export type RiasecLetter = "R" | "I" | "A" | "S" | "E" | "C";

export interface RiasecScores {
  rScore: number;
  iScore: number;
  aScore: number;
  sScore: number;
  eScore: number;
  cScore: number;
  summaryCode: string;
  scienceAffinity: number;
  humanitiesAffinity: number;
  businessAffinity: number;
}

export interface RiasecQuestion {
  id: number;
  type: RiasecLetter;
  text: string;
}

export type BfiTrait = "O" | "C" | "E" | "A" | "N";

export interface BfiScores {
  opennessScore: number;
  conscientiousnessScore: number;
  extraversionScore: number;
  agreeablenessScore: number;
  neuroticismScore: number;
}

export interface BfiQuestion {
  id: number;
  trait: BfiTrait;
  text: string;
  reverseKeyed: boolean;
}

export interface AcademicAffinityInput {
  scienceScore: number;    // 0-100, stream-specific
  humanitiesScore: number; // 0-100, stream-specific
  businessScore: number;   // 0-100, stream-specific
}

export interface RiasecAffinityInput {
  scienceAffinity: number;
  humanitiesAffinity: number;
  businessAffinity: number;
}

export interface PersonalityInput {
  opennessScore: number;
  conscientiousnessScore: number;
  extraversionScore: number;
  agreeablenessScore: number;
  // neuroticismScore intentionally excluded from SAW weighting — see saw.ts
  // for rationale; it's still persisted on PersonalityProfile for completeness.
}

export interface AhpResult {
  weights: [number, number, number]; // [academic, riasec, personality]
  lambda: number;
  ci: number;
  cr: number;
  consistent: boolean;
  labels: [string, string, string];
}

export interface StreamScore {
  stream: Stream;
  score: number;
}

export interface SawNormalisedBreakdown {
  academicScience: number;
  academicHumanities: number;
  academicBusiness: number;
  riasecScience: number;
  riasecHumanities: number;
  riasecBusiness: number;
  personalityScience: number;
  personalityHumanities: number;
  personalityBusiness: number;
}

export interface SawResult {
  ranked: StreamScore[];
  topStream: Stream;
  vScience: number;
  vHumanities: number;
  vBusiness: number;
  confidenceLevel: number;
  normalised: SawNormalisedBreakdown;
}

// ── Academic scoring (SubjectScore-based) ──────────────────────────────────

/** One normalized subject score row, as submitted by the client. */
export interface SubjectScoreEntry {
  subject: string; // Subject enum value, validated by Zod before reaching here
  level: "JSS3" | "SS1";
  score: number; // 0-100
}

/** Result of aggregating a student's SubjectScore rows into the two
 * level averages used by the weighted-score formula. */
export interface AcademicAggregate {
  jss3Average: number;
  ss1Average: number;
  weightedAcademicScore: number;
}