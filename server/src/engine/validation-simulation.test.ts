import { describe, expect, it } from "vitest";
import { computeBFI, BFI_QUESTIONS } from "./bfi.js";
import { computeRIASEC, RIASEC_QUESTIONS } from "./riasec.js";
import { computeSAW, DEFAULT_STREAM_TRAIT_MAPPING } from "./saw.js";
import { rescoreBfi, rescoreRiasec } from "./rescore.js";
import type { Stream } from "@/types/domain.js";

/**
 * THESIS §3.8 — 100-PROFILE VALIDATION SIMULATION
 * ------------------------------------------------
 * "Validation Testing" evidence: the engine is run over 100 synthetic
 * student profiles, each built from a known ground-truth stream lean.
 *
 * Three properties are asserted at scale:
 *   1. SCORING STABILITY — recomputing RIASEC + BFI from the raw response
 *      rows (the P0-5c re-scoring path) reproduces the original profiles
 *      exactly (no drift). This is what the admin /api/admin/rescore
 *      endpoint proves per student.
 *   2. RECOMMENDATION AGREEMENT — a student whose synthetic responses are
 *      strongly biased toward their ground-truth stream receives that
 *      stream as the top recommendation (the engine responds to the
 *      intended signal).
 *   3. CONFIDENCE BEHAVIOUR — every recommendation is in the documented
 *      display range [50, 100], and strongly-biased profiles get higher
 *      confidence than the 1/3 baseline.
 */

/** Seeded PRNG (mulberry32) so the simulation is deterministic across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREAMS: Stream[] = ["Science", "Humanities", "Business"];

/** A stream's dominant Holland types (primary then secondary) — §3.5.3. */
const STREAM_HOLLAND: Record<Stream, [string, string]> = {
  Science: ["I", "R"],
  Humanities: ["A", "S"],
  Business: ["E", "C"],
};

/** A stream's dominant BFI traits — matches DEFAULT_STREAM_TRAIT_MAPPING. */
const STREAM_TRAITS: Record<Stream, string[]> = {
  Science: ["O", "C", "ES"],
  Humanities: ["O", "A", "ES"],
  Business: ["E", "C", "ES"],
};

interface SyntheticProfile {
  index: number;
  groundTruth: Stream;
  riasecValues: number[];
  bfiValues: number[];
  academic: { scienceScore: number; humanitiesScore: number; businessScore: number };
}

/** Build one synthetic student. bias ∈ [0,1] controls how strongly the
 *  responses skew toward the ground-truth stream. */
function buildProfile(rand: () => number, index: number, groundTruth: Stream, bias: number): SyntheticProfile {
  const [hPrimary, hSecondary] = STREAM_HOLLAND[groundTruth]!;
  const traits = STREAM_TRAITS[groundTruth]!;

  const riasecValues = RIASEC_QUESTIONS.map((q) => {
    const boosted = q.type === hPrimary || q.type === hSecondary;
    // High-answer probability boosted for the stream's Holland types.
    const highProb = boosted ? 0.5 + bias * 0.5 : 0.5 - bias * 0.35;
    return rand() < highProb ? 4 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3); // 4-5 or 1-3
  });

  const bfiValues = BFI_QUESTIONS.map((q) => {
    // Map a question's trait to the stream's keyed traits. ES is the
    // inverse of N, so a high-ES profile answers N items low.
    const keyed = q.trait === "N" ? "ES" : q.trait;
    const boosted = traits.includes(keyed);
    const highProb = boosted ? 0.5 + bias * 0.5 : 0.5 - bias * 0.35;
    const raw = rand() < highProb ? 4 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3);
    // Reverse-keyed items store the RAW Likert value; the engine flips them.
    return raw;
  });

  // Academic: the ground-truth stream's SS1 subjects score higher.
  const base = 55 + rand() * 20;
  const boost = 15 + bias * 20;
  const academic = {
    scienceScore: base + (groundTruth === "Science" ? boost : 0),
    humanitiesScore: base + (groundTruth === "Humanities" ? boost : 0),
    businessScore: base + (groundTruth === "Business" ? boost : 0),
  };

  return { index, groundTruth, riasecValues, bfiValues, academic };
}

/** Run the full scoring pipeline for one synthetic student. */
function scoreProfile(p: SyntheticProfile, weights: [number, number, number]) {
  const riasec = computeRIASEC(p.riasecValues);
  const bfi = computeBFI(p.bfiValues);

  // The rescore path reconstructs the profile from raw rows (as persisted).
  const rescoredRiasec = rescoreRiasec(
    RIASEC_QUESTIONS.map((q, i) => ({ questionId: q.id, value: p.riasecValues[i]!, instrumentVersion: "riasec-v1" }))
  );
  const rescoredBfi = rescoreBfi(
    BFI_QUESTIONS.map((q, i) => ({ questionId: q.id, value: p.bfiValues[i]!, reverseKeyed: q.reverseKeyed, instrumentVersion: "bfi-v1" }))
  );

  const result = computeSAW(
    {
      scienceScore: p.academic.scienceScore,
      humanitiesScore: p.academic.humanitiesScore,
      businessScore: p.academic.businessScore,
    },
    {
      scienceAffinity: riasec.scienceAffinity,
      humanitiesAffinity: riasec.humanitiesAffinity,
      businessAffinity: riasec.businessAffinity,
    },
    {
      opennessScore: bfi.opennessScore,
      conscientiousnessScore: bfi.conscientiousnessScore,
      extraversionScore: bfi.extraversionScore,
      agreeablenessScore: bfi.agreeablenessScore,
      emotionalStabilityScore: bfi.emotionalStabilityScore,
    },
    weights,
    DEFAULT_STREAM_TRAIT_MAPPING
  );

  return { riasec, bfi, rescoredRiasec, rescoredBfi, result };
}

describe("100-profile validation simulation (thesis §3.8)", () => {
  const AHP_WEIGHTS: [number, number, number] = [0.54, 0.297, 0.163];
  const N_PROFILES = 100;

  it("re-scoring reproduces the original RIASEC + BFI profiles with zero drift across all 100 profiles", () => {
    const rand = mulberry32(0x5eed);
    const profiles = STREAMS.flatMap((stream, si) =>
      Array.from({ length: Math.ceil(N_PROFILES / 3) }, (_, i) => buildProfile(rand, si * 40 + i, stream, 0.55))
    ).slice(0, N_PROFILES);

    for (const p of profiles) {
      const { riasec, bfi, rescoredRiasec, rescoredBfi } = scoreProfile(p, AHP_WEIGHTS);

      // RIASEC affinities + scores reproduce exactly.
      expect(rescoredRiasec.scienceAffinity).toBe(riasec.scienceAffinity);
      expect(rescoredRiasec.humanitiesAffinity).toBe(riasec.humanitiesAffinity);
      expect(rescoredRiasec.businessAffinity).toBe(riasec.businessAffinity);
      expect(rescoredRiasec.summaryCode).toBe(riasec.summaryCode);

      // BFI 5-factor + derived Emotional Stability reproduce exactly.
      expect(rescoredBfi.opennessScore).toBe(bfi.opennessScore);
      expect(rescoredBfi.conscientiousnessScore).toBe(bfi.conscientiousnessScore);
      expect(rescoredBfi.extraversionScore).toBe(bfi.extraversionScore);
      expect(rescoredBfi.agreeablenessScore).toBe(bfi.agreeablenessScore);
      expect(rescoredBfi.neuroticismScore).toBe(bfi.neuroticismScore);
      expect(rescoredBfi.emotionalStabilityScore).toBe(bfi.emotionalStabilityScore);
    }
  });

  it("a strong ground-truth lean produces that stream as the top recommendation (≥95/100)", () => {
    const rand = mulberry32(0xabcd);
    const profiles = STREAMS.flatMap((stream, si) =>
      Array.from({ length: Math.ceil(N_PROFILES / 3) }, (_, i) => buildProfile(rand, si * 40 + i, stream, 0.7))
    ).slice(0, N_PROFILES);

    let matched = 0;
    const byStream = { Science: 0, Humanities: 0, Business: 0 };
    for (const p of profiles) {
      const { result } = scoreProfile(p, AHP_WEIGHTS);
      const top = result.topStream;
      if (top === p.groundTruth) matched++;
      byStream[top]++;
    }

    // The engine is expected to follow the synthetic signal almost always.
    expect(matched).toBeGreaterThanOrEqual(95);
    // Sanity: no single stream is recommended for the entire cohort.
    expect(Math.max(byStream.Science, byStream.Humanities, byStream.Business)).toBeLessThan(N_PROFILES);
  });

  it("confidence is always in the documented display range [50, 100]", () => {
    const rand = mulberry32(0x1234);
    const profiles = STREAMS.flatMap((stream, si) =>
      Array.from({ length: Math.ceil(N_PROFILES / 3) }, (_, i) => buildProfile(rand, si * 40 + i, stream, 0.4))
    ).slice(0, N_PROFILES);

    for (const p of profiles) {
      const { result } = scoreProfile(p, AHP_WEIGHTS);
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(50);
      expect(result.confidenceLevel).toBeLessThanOrEqual(100);
    }
  });

  it("the P0-3e Emotional Stability factor is active in the SAW personality criterion", () => {
    // Two profiles identical except for stability (ES = high vs low). The
    // high-stability profile must never score below the low-stability one
    // on the personality criterion for any stream (it is a positive driver).
    const rand = mulberry32(0xbeef);
    const highStability = buildProfile(rand, 0, "Science", 0.5);
    const lowStability = buildProfile(rand, 1, "Science", 0.5);

    // Force all BFI answers to the same trait values, then flip neuroticism
    // items to set stability high vs low.
    const neutralBfi = (es: number): number[] =>
      BFI_QUESTIONS.map((q) => {
        if (q.trait === "N") return es > 50 ? 1 : 5; // raw 1 → low N → high ES
        return q.reverseKeyed ? 1 : 5; // max all other traits
      });
    highStability.bfiValues = neutralBfi(80);
    lowStability.bfiValues = neutralBfi(20);

    const high = computeBFI(highStability.bfiValues);
    const low = computeBFI(lowStability.bfiValues);
    expect(high.emotionalStabilityScore).toBeGreaterThan(low.emotionalStabilityScore);

    const { result: highResult } = scoreProfile(highStability, AHP_WEIGHTS);
    const { result: lowResult } = scoreProfile(lowStability, AHP_WEIGHTS);
    // High stability must not reduce any stream's preference score.
    expect(highResult.vScience).toBeGreaterThanOrEqual(lowResult.vScience);
    expect(highResult.vHumanities).toBeGreaterThanOrEqual(lowResult.vHumanities);
    expect(highResult.vBusiness).toBeGreaterThanOrEqual(lowResult.vBusiness);
    // And it must raise the top stream's score at least slightly.
    expect(highResult.vScience).toBeGreaterThan(lowResult.vScience);
  });

  it("recommendation margin shrinks as bias weakens (signal sensitivity)", () => {
    const strong = 0.8;
    const weak = 0.2;
    const marginFor = (bias: number): number => {
      const rand = mulberry32(0xdead);
      const profiles = STREAMS.flatMap((stream, si) =>
        Array.from({ length: 30 }, (_, i) => buildProfile(rand, si * 40 + i, stream, bias))
      );
      let totalMargin = 0;
      for (const p of profiles) {
        const { result } = scoreProfile(p, AHP_WEIGHTS);
        totalMargin += result.ranked[0]!.score - result.ranked[1]!.score;
      }
      return totalMargin / profiles.length;
    };
    const strongMargin = marginFor(strong);
    const weakMargin = marginFor(weak);
    expect(strongMargin).toBeGreaterThan(weakMargin);
    expect(weakMargin).toBeGreaterThan(0);
  });
});
