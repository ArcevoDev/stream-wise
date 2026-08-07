import { describe, expect, it } from "vitest";
import {
  computeSAW,
  DEFAULT_STREAM_TRAIT_MAPPING,
} from "./saw.js";
import type { AcademicAffinityInput, PersonalityInput, RiasecAffinityInput, StreamTraitMapping } from "@/types/domain.js";

const AHP_WEIGHTS: [number, number, number] = [0.54, 0.297, 0.163];

const academic = (science: number, humanities: number, business: number): AcademicAffinityInput => ({
  scienceScore: science,
  humanitiesScore: humanities,
  businessScore: business,
});

const riasec = (science: number, humanities: number, business: number): RiasecAffinityInput => ({
  scienceAffinity: science,
  humanitiesAffinity: humanities,
  businessAffinity: business,
});

const personality = (o = 60, c = 60, e = 60, a = 60, es = 60): PersonalityInput => ({
  opennessScore: o,
  conscientiousnessScore: c,
  extraversionScore: e,
  agreeablenessScore: a,
  emotionalStabilityScore: es,
});

describe("computeSAW", () => {
  it("uses the 3-trait personality mapping incl. Emotional Stability (P0-3e)", () => {
    expect(DEFAULT_STREAM_TRAIT_MAPPING.Science).toEqual([
      "opennessScore",
      "conscientiousnessScore",
      "emotionalStabilityScore",
    ]);
    expect(DEFAULT_STREAM_TRAIT_MAPPING.Humanities).toEqual([
      "opennessScore",
      "agreeablenessScore",
      "emotionalStabilityScore",
    ]);
    expect(DEFAULT_STREAM_TRAIT_MAPPING.Business).toEqual([
      "extraversionScore",
      "conscientiousnessScore",
      "emotionalStabilityScore",
    ]);
  });

  it("ranks a science-leaning profile top (dominant across all three criteria)", () => {
    const result = computeSAW(
      academic(90, 40, 40),
      riasec(90, 40, 40),
      personality(90, 90, 40, 40, 90),
      AHP_WEIGHTS
    );
    expect(result.topStream).toBe("Science");
    expect(result.ranked[0]!.stream).toBe("Science");
    expect(result.vScience).toBeGreaterThan(result.vHumanities);
    expect(result.vScience).toBeGreaterThan(result.vBusiness);
  });

  it("ranks a business-leaning profile top", () => {
    const result = computeSAW(
      academic(40, 40, 90),
      riasec(40, 40, 90),
      personality(40, 90, 90, 40, 90),
      AHP_WEIGHTS
    );
    expect(result.topStream).toBe("Business");
  });

  it("normalises scores to [0,1] against the 100 max and clamps", () => {
    const result = computeSAW(academic(120, -10, 50), riasec(50, 50, 50), personality(), AHP_WEIGHTS);
    expect(result.normalised.academicScience).toBe(1); // 120 → clamped to 1
    expect(result.normalised.academicHumanities).toBe(0); // -10 → clamped to 0
    expect(result.normalised.academicBusiness).toBe(0.5);
  });

  it("falls back to the 1/3 confidence baseline on zero inputs", () => {
    const result = computeSAW(academic(0, 0, 0), riasec(0, 0, 0), personality(0, 0, 0, 0, 0), AHP_WEIGHTS);
    // All scores are 0 → totalScore 0 → rawCL = 1/3 → displayCL = 50%.
    expect(result.confidenceLevel).toBe(50);
    expect(result.topStream).toBe("Science"); // deterministic tie-break by sort order
  });

  it("rescales raw confidence 1/3 → 50% and 1 → 100% (P0-3c)", () => {
    // Perfect dominance across Academic + RIASEC (Science=1, others=0).
    // The personality criterion still contributes a positive 0.5 to the
    // other streams (each stream's mean-of-3 mapping pulls in ES), so the
    // rawCL is 0.82 → displayed 86.6%, not 100%.
    const dominant = computeSAW(academic(100, 0, 0), riasec(100, 0, 0), personality(100, 100, 0, 0, 100), AHP_WEIGHTS);
    expect(dominant.confidenceLevel).toBe(86.6);

    // True rawCL = 1 → 100% requires the other streams' personality means
    // to be zero too. Isolate Science's traits with a custom mapping whose
    // Humanities/Business rows point at zeroed traits.
    const isolateScience: StreamTraitMapping = {
      Science: ["opennessScore", "conscientiousnessScore", "emotionalStabilityScore"],
      Humanities: ["extraversionScore", "agreeablenessScore", "extraversionScore"],
      Business: ["extraversionScore", "agreeablenessScore", "extraversionScore"],
    };
    const totalDominant = computeSAW(academic(100, 0, 0), riasec(100, 0, 0), personality(100, 100, 0, 0, 100), AHP_WEIGHTS, isolateScience);
    expect(totalDominant.confidenceLevel).toBe(100);

    // Perfect tie: all scores equal → rawCL = 1/3 → displayed 50%.
    const tied = computeSAW(academic(60, 60, 60), riasec(60, 60, 60), personality(), AHP_WEIGHTS);
    expect(tied.confidenceLevel).toBe(50);
  });

  it("respects a passed-in trait mapping (versioned config)", () => {
    // Science mapping points at a high trait; without it Science would not lead.
    const customMapping: StreamTraitMapping = {
      Science: ["opennessScore", "conscientiousnessScore", "emotionalStabilityScore"],
      Humanities: ["opennessScore", "agreeablenessScore", "emotionalStabilityScore"],
      Business: ["extraversionScore", "conscientiousnessScore", "emotionalStabilityScore"],
    };
    const result = computeSAW(academic(60, 60, 60), riasec(60, 60, 60), personality(100, 100, 60, 60, 100), AHP_WEIGHTS, customMapping);
    expect(result.topStream).toBe("Science");
  });
});
