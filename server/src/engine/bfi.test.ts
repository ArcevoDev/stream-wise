import { describe, expect, it } from "vitest";
import { BFI_QUESTIONS, computeBFI } from "./bfi.js";

describe("computeBFI", () => {
  it("throws when not given exactly 20 responses", () => {
    expect(() => computeBFI([5, 5, 5, 5])).toThrow(/20 responses/);
  });

  it("throws on an out-of-range Likert value", () => {
    const responses = Array(20).fill(3);
    responses[0] = 6;
    expect(() => computeBFI(responses)).toThrow(/out of range/);
  });

  it("reverse-keyed items are flipped (6 − v) before aggregation", () => {
    // All forward-keyed items = 5, all reverse-keyed items = 1.
    // After flipping, every item contributes 5 → all traits = 100.
    const responses = BFI_QUESTIONS.map((q) => (q.reverseKeyed ? 1 : 5));
    const scores = computeBFI(responses);
    expect(scores.opennessScore).toBe(100);
    expect(scores.conscientiousnessScore).toBe(100);
    expect(scores.extraversionScore).toBe(100);
    expect(scores.agreeablenessScore).toBe(100);
    expect(scores.neuroticismScore).toBe(100);
  });

  it("normalises 4-item trait sums to a 0-100 scale", () => {
    // All items = 3 (neutral): raw sum per trait = 12/20 → 60.
    const scores = computeBFI(Array(20).fill(3));
    expect(scores.opennessScore).toBe(60);
    expect(scores.conscientiousnessScore).toBe(60);
    expect(scores.extraversionScore).toBe(60);
    expect(scores.agreeablenessScore).toBe(60);
    expect(scores.neuroticismScore).toBe(60);
  });

  it("derives emotionalStabilityScore as 100 − neuroticism (P0-3e)", () => {
    // Max neuroticism: forward-keyed N items = 5; the one reverse-keyed N
    // item (q18 "remain calm") = 1 so it flips to 5 → raw 5×4 = 20 → 100.
    const neuroticResponses = BFI_QUESTIONS.map((q) => (q.trait === "N" ? (q.reverseKeyed ? 1 : 5) : 3));
    const highNeuroticism = computeBFI(neuroticResponses);
    expect(highNeuroticism.neuroticismScore).toBe(100);
    expect(highNeuroticism.emotionalStabilityScore).toBe(0);

    // Minimal neuroticism: forward-keyed N items = 1; reverse-keyed item = 5
    // (flips to 1) → raw 1×4 = 4 → 20. Stability = 80.
    const calmResponses = BFI_QUESTIONS.map((q) => (q.trait === "N" ? (q.reverseKeyed ? 5 : 1) : 3));
    const calm = computeBFI(calmResponses);
    expect(calm.neuroticismScore).toBe(20);
    expect(calm.emotionalStabilityScore).toBe(80);
  });

  it("every question maps to one of the five traits", () => {
    expect(BFI_QUESTIONS).toHaveLength(20);
    const traits = new Set(BFI_QUESTIONS.map((q) => q.trait));
    expect([...traits].sort()).toEqual(["A", "C", "E", "N", "O"]);
  });
});
