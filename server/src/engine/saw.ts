/**
 * SAW ENGINE - Simple Additive Weighting
 * ----------------------------------------
 * Normalises student profile data and computes ranked
 * preference scores (Vi) for each academic stream.
 *
 * Streams:
 *   A1 = Science
 *   A2 = Humanities
 *   A3 = Business
 *
 * Formula: Vi = sum(wj * Rij)
 *   where Rij = xij / max_domain
 *   [Global scale normalisation; max_domain = 100 to preserve absolute
 *    psychometric calibration and distance metrics across instruments]
 *
 * P0-2 seam: criterion weights are passed IN as a parameter (typed as the
 * [academic, riasec, personality] triple), and the personality→stream trait
 * mapping is an explicit config argument with a documented default. No
 * module-level weight constants are imported.
 */

import type {
  AcademicAffinityInput,
  PersonalityInput,
  RiasecAffinityInput,
  SawResult,
  Stream,
  StreamTraitMapping,
} from "@/types/domain.js";

/**
 * Default personality→stream trait mapping (thesis §3.5.3):
 *   Science    = mean(Openness, Conscientiousness, Emotional Stability)
 *   Humanities = mean(Openness, Agreeableness, Emotional Stability)
 *   Business   = mean(Extraversion, Conscientiousness, Emotional Stability)
 *
 * P0-3e: neuroticism is now included in the methodology as the inverted
 * EMOTIONAL STABILITY factor (100 − neuroticism), per the Five-Factor Model
 * grounding in the thesis (§2.3.3, §2.3.4): low neuroticism / high stability
 * predicts a student's capacity to sustain the workload of any demanding
 * stream, so it is a legitimate positive driver for all three streams rather
 * than a criterion with no established direction. This resolves the earlier
 * "excluded from SAW" decision. The trait is a first-class 5-factor input.
 */
export const DEFAULT_STREAM_TRAIT_MAPPING: StreamTraitMapping = {
  Science: ["opennessScore", "conscientiousnessScore", "emotionalStabilityScore"],
  Humanities: ["opennessScore", "agreeablenessScore", "emotionalStabilityScore"],
  Business: ["extraversionScore", "conscientiousnessScore", "emotionalStabilityScore"],
};

/**
 * Normalise a value to [0, 1] range (clamped).
 */
function normalise(value: number, max: number): number {
  if (max === 0) return 0;
  const ratio = value / max;
  return Math.min(1, Math.max(0, ratio));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Compute SAW preference scores for all three streams.
 *
 * @param academic    - { scienceScore, humanitiesScore, businessScore } (0-100 each)
 * @param riasec      - { scienceAffinity, humanitiesAffinity, businessAffinity } (0-100 each)
 * @param personality - { opennessScore, conscientiousnessScore, extraversionScore, agreeablenessScore } (0-100 each)
 * @param weights     - criterion weights [academic, riasec, personality]. From an AhpWeightSet row, never a constant
 * @param traitMapping - personality trait pairs per stream (versioned config; defaults to thesis §3.5.3)
 */
export function computeSAW(
  academic: AcademicAffinityInput,
  riasec: RiasecAffinityInput,
  personality: PersonalityInput,
  weights: [number, number, number],
  traitMapping: StreamTraitMapping = DEFAULT_STREAM_TRAIT_MAPPING
): SawResult {
  const [W_ACADEMIC, W_RIASEC, W_PERSONALITY] = weights;

  const R_academic_science = normalise(academic.scienceScore, 100);
  const R_academic_humanities = normalise(academic.humanitiesScore, 100);
  const R_academic_business = normalise(academic.businessScore, 100);

  const R_riasec_science = normalise(riasec.scienceAffinity, 100);
  const R_riasec_humanities = normalise(riasec.humanitiesAffinity, 100);
  const R_riasec_business = normalise(riasec.businessAffinity, 100);

  const personalityFor = (stream: Stream): number => {
    const traits = traitMapping[stream];
    return mean(traits.map((t) => personality[t]));
  };

  const R_personality_science = normalise(personalityFor("Science"), 100);
  const R_personality_humanities = normalise(personalityFor("Humanities"), 100);
  const R_personality_business = normalise(personalityFor("Business"), 100);

  const vScience = W_ACADEMIC * R_academic_science + W_RIASEC * R_riasec_science + W_PERSONALITY * R_personality_science;
  const vHumanities = W_ACADEMIC * R_academic_humanities + W_RIASEC * R_riasec_humanities + W_PERSONALITY * R_personality_humanities;
  const vBusiness = W_ACADEMIC * R_academic_business + W_RIASEC * R_riasec_business + W_PERSONALITY * R_personality_business;

  // ── Rank streams ─────────────────────────────────────────
  const streams: { stream: Stream; score: number }[] = [
    { stream: "Science" as Stream, score: vScience },
    { stream: "Humanities" as Stream, score: vHumanities },
    { stream: "Business" as Stream, score: vBusiness },
  ].sort((a, b) => b.score - a.score);

  const totalScore = vScience + vHumanities + vBusiness;
  const rawCL = totalScore > 0 ? streams[0]!.score / totalScore : 1 / 3; // fallback to the "all equal" baseline

  // P0-3c: min-max rescale raw CL to display range [0.50, 1.00] so the
  // displayed % is always interpretable (lowest meaningful = 50%). The
  // 50-minimum is a documented display choice (see confidence.ts). The
  // raw CL 1/3 baseline maps to 50%.
  const displayCL = 0.5 + ((rawCL - 1 / 3) / (1 - 1 / 3)) * 0.5;
  const confidenceLevel = Math.min(100, Math.max(50, displayCL * 100));

  return {
    ranked: streams,
    topStream: streams[0]!.stream,
    vScience: parseFloat(vScience.toFixed(4)),
    vHumanities: parseFloat(vHumanities.toFixed(4)),
    vBusiness: parseFloat(vBusiness.toFixed(4)),
    confidenceLevel: parseFloat(confidenceLevel.toFixed(1)),
    normalised: {
      academicScience: parseFloat(R_academic_science.toFixed(3)),
      academicHumanities: parseFloat(R_academic_humanities.toFixed(3)),
      academicBusiness: parseFloat(R_academic_business.toFixed(3)),

      riasecScience: parseFloat(R_riasec_science.toFixed(3)),
      riasecHumanities: parseFloat(R_riasec_humanities.toFixed(3)),
      riasecBusiness: parseFloat(R_riasec_business.toFixed(3)),
      personalityScience: parseFloat(R_personality_science.toFixed(3)),
      personalityHumanities: parseFloat(R_personality_humanities.toFixed(3)),
      personalityBusiness: parseFloat(R_personality_business.toFixed(3)),
    },
  };
}
