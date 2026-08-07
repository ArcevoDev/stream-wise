// ============================================================================
// Shared domain types for the AHP-SAW decision engine and related modules.
// Centralising these avoids re-declaring the same shapes in every engine
// file and keeps controller <-> engine contracts explicit.
//
// These are pure computation-layer types. Deliberately NOT copies of
// Prisma model shapes (those are imported from the generated client
// directly wherever needed). This file only holds the intermediate shapes
// the AHP/SAW/RIASEC/BFI math passes between functions.
// ============================================================================

export type Stream = "Science" | "Humanities" | "Business";

/** Criterion weight triple [academic, riasec, personality] (P0-2 seam). */
export type CriterionWeights = [number, number, number];

/** Personality trait names usable as SAW inputs. */
export type PersonalityTraitKey =
  | "opennessScore"
  | "conscientiousnessScore"
  | "extraversionScore"
  | "agreeablenessScore"
  | "emotionalStabilityScore"; // P0-3e: derived 100 − neuroticismScore

/** Personality→stream trait mapping (P0-1e versioned config shape). */
export type StreamTraitMapping = Record<Stream, PersonalityTraitKey[]>;

/**
 * P0-2e: single source of truth for stream identity.
 * The engine works in "Science"/"Humanities"/"Business" strings; the DB uses
 * the AcademicStream enum. This map is the ONLY bridge. Controllers must not
 * hand-roll their own streamEnumMap literals.
 */
export const STREAM_TO_ENUM = {
  Science: "SCIENCE",
  Humanities: "HUMANITIES",
  Business: "BUSINESS",
} as const;

export const ENUM_TO_STREAM = {
  SCIENCE: "Science",
  HUMANITIES: "Humanities",
  BUSINESS: "Business",
} as const;

export type StreamEnumValue = (typeof STREAM_TO_ENUM)[Stream];

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
  /** P0-3e: derived 100 minus neuroticismScore. SAW's 5-factor stability input. */
  emotionalStabilityScore: number;
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
  /**
   * P0-3e: derived Emotional Stability = 100 − neuroticismScore, computed by
   * the recommend controller from the raw BFI trait. Neuroticism itself has
   * no positive stream direction (high neuroticism is never a positive
   * driver), but its inverse, stability under pressure, predicts a
   * student's capacity to sustain any demanding stream's workload (§2.3.4),
   * so it now feeds every stream's personality criterion as a 5-factor input.
   * This is a DECISION, resolved from the earlier "excluded from SAW" state
   * (see saw.ts + bfi.ts). Cited in the thesis §3.5.3.
   */
  emotionalStabilityScore: number;
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