import { describe, expect, it } from "vitest";
import { explainRecommendation, generateGuidanceInsight } from "./confidence.js";
import { computeSAW } from "./saw.js";
import type { AcademicAffinityInput, PersonalityInput, RiasecAffinityInput } from "@/types/domain.js";

const AHP_WEIGHTS: [number, number, number] = [0.54, 0.297, 0.163];

function scienceDominant() {
  const academic: AcademicAffinityInput = { scienceScore: 90, humanitiesScore: 40, businessScore: 40 };
  const riasec: RiasecAffinityInput = { scienceAffinity: 90, humanitiesAffinity: 40, businessAffinity: 40 };
  const personality: PersonalityInput = {
    opennessScore: 90,
    conscientiousnessScore: 90,
    extraversionScore: 40,
    agreeablenessScore: 40,
    emotionalStabilityScore: 90,
  };
  return computeSAW(academic, riasec, personality, AHP_WEIGHTS);
}

describe("explainRecommendation", () => {
  it("produces a per-criterion contribution breakdown per stream (P0-2d)", () => {
    const saw = scienceDominant();
    const rows = explainRecommendation(saw, AHP_WEIGHTS);

    expect(rows).toHaveLength(3);
    const science = rows.find((r) => r.stream === "Science")!;
    expect(science.contributions.map((c) => c.criterion)).toEqual(["Academic", "RIASEC", "Personality"]);

    // contribution = normalised × weight
    const academic = science.contributions[0]!;
    expect(academic.normalised).toBeCloseTo(0.9, 3);
    expect(academic.contribution).toBeCloseTo(0.9 * 0.54, 3);
  });

  it("contribution weights default to 1 when no weights are passed", () => {
    const saw = scienceDominant();
    const rows = explainRecommendation(saw);
    const science = rows.find((r) => r.stream === "Science")!;
    expect(science.contributions[0]!.weight).toBe(1);
    expect(science.contributions[0]!.contribution).toBeCloseTo(science.contributions[0]!.normalised, 3);
  });
});

describe("generateGuidanceInsight", () => {
  it("includes the top stream, summary code, and ranked scores", () => {
    const saw = scienceDominant();
    const insight = generateGuidanceInsight("Science", "IRC", 92, 90, saw);
    expect(insight).toContain("Science Stream");
    expect(insight).toContain("IRC");
    expect(insight).toContain("Confidence Level: 92%");
    expect(insight).toContain("guidance counsellor");
  });
});
