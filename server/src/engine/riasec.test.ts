import { describe, expect, it } from "vitest";
import {
  computeRIASEC,
  DEFAULT_RIASEC_STREAM_MAPPING,
  RIASEC_QUESTIONS,
} from "./riasec.js";

/** 48 all-3 responses: every Holland type scores 24/40 → 60. */
const ALL_THREE = Array(48).fill(3);

describe("computeRIASEC", () => {
  it("throws when not given exactly 48 responses", () => {
    expect(() => computeRIASEC([5])).toThrow(/48 responses/);
  });

  it("scores each Holland type from its 8 items, normalised to 0-100", () => {
    // Push every Investigative (I) item to 5, everything else to 1.
    const responses = RIASEC_QUESTIONS.map((q) => (q.type === "I" ? 5 : 1));
    const scores = computeRIASEC(responses);
    expect(scores.iScore).toBe(100); // 8 × 5 = 40/40
    expect(scores.rScore).toBe(20); // 8 × 1 = 8/40
    expect(scores.aScore).toBe(20);
    expect(scores.sScore).toBe(20);
    expect(scores.eScore).toBe(20);
    expect(scores.cScore).toBe(20);
  });

  it("derives the 3-letter summary code from the top three types", () => {
    const responses = RIASEC_QUESTIONS.map((q) => (q.type === "I" ? 5 : 1));
    const scores = computeRIASEC(responses);
    // I dominates; the rest tie → sorted order decides. I first.
    expect(scores.summaryCode).toContain("I");
    expect(scores.summaryCode).toHaveLength(3);
  });

  it("neutral responses tie at 60 with no dominating type", () => {
    const scores = computeRIASEC(ALL_THREE);
    expect(scores.rScore).toBe(60);
    expect(scores.iScore).toBe(60);
    expect(scores.aScore).toBe(60);
    expect(scores.sScore).toBe(60);
    expect(scores.eScore).toBe(60);
    expect(scores.cScore).toBe(60);
  });

  it("maps stream affinity via the 60/40 primary/secondary config (thesis §3.5.3)", () => {
    // Dominant Investigative + Realistic profile → Science affinity highest.
    const responses = RIASEC_QUESTIONS.map((q) => (q.type === "I" || q.type === "R" ? 5 : 1));
    const scores = computeRIASEC(responses);
    expect(scores.scienceAffinity).toBeGreaterThan(scores.humanitiesAffinity);
    expect(scores.scienceAffinity).toBeGreaterThan(scores.businessAffinity);

    // Config math: I=100 (60%) + R=100 (40%) → 100.
    expect(scores.scienceAffinity).toBeCloseTo(100, 1);
  });

  it("honours a custom stream mapping (versioned config)", () => {
    const customMapping = {
      ...DEFAULT_RIASEC_STREAM_MAPPING,
      science: { primary: "A" as const, secondary: "S" as const, primaryWeight: 0.6 },
    };
    const artistic = RIASEC_QUESTIONS.map((q) => (q.type === "A" ? 5 : 1));
    const scores = computeRIASEC(artistic, customMapping);
    // A=100 (0.6) + S=20 (0.4) → 68; the custom mapping makes Science and
    // Humanities both draw on A, so both are 68 and Science wins the tie
    // only if the secondary also favours it — here both are equal.
    expect(scores.scienceAffinity).toBeCloseTo(68, 1); // A now drives Science
    expect(scores.humanitiesAffinity).toBeCloseTo(68, 1); // A+S also drives Humanities
  });
});
