import { describe, expect, it } from "vitest";
import {
  computeAhpWeights,
  DEFAULT_CRITERION_LABELS,
  DEFAULT_PAIRWISE_MATRIX,
} from "./ahp.js";

describe("computeAhpWeights", () => {
  it("derives the canonical weights [0.539, 0.297, 0.164] from the expert matrix", () => {
    const result = computeAhpWeights(DEFAULT_PAIRWISE_MATRIX);
    // Thesis §3.5.2: five guidance counsellors' pairwise judgements.
    expect(result.weights[0]).toBeCloseTo(0.54, 2);
    expect(result.weights[1]).toBeCloseTo(0.297, 2);
    expect(result.weights[2]).toBeCloseTo(0.163, 2);
    expect(result.weights).toHaveLength(3);
  });

  it("is consistent (CR ≈ 0.007, below the 0.10 Saaty threshold)", () => {
    const result = computeAhpWeights(DEFAULT_PAIRWISE_MATRIX);
    expect(result.cr).toBeLessThan(0.1);
    expect(result.cr).toBeCloseTo(0.007, 2);
    expect(result.consistent).toBe(true);
  });

  it("returns the default criterion labels", () => {
    const result = computeAhpWeights();
    expect(result.labels).toEqual(DEFAULT_CRITERION_LABELS);
  });

  it("weights sum to 1", () => {
    const result = computeAhpWeights(DEFAULT_PAIRWISE_MATRIX);
    const sum = result.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it("throws when CR exceeds 0.10 (Saaty rejection)", () => {
    // A wildly inconsistent matrix: C1 vs C2 = 9, C2 vs C1 = 9 breaks reciprocity
    // and pushes the CR far past 0.10.
    const inconsistent = [
      [1, 9, 1 / 9],
      [9, 1, 9],
      [9, 1 / 9, 1],
    ];
    expect(() => computeAhpWeights(inconsistent)).toThrow(/Consistency Ratio/);
  });

  it("throws on a non-square matrix", () => {
    expect(() => computeAhpWeights([[1, 2], [1]])).toThrow(/square/);
  });
});
