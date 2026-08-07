/**
 * AHP ENGINE. Analytic Hierarchy Process
 * ----------------------------------------
 * Derives criterion weights from a pairwise comparison matrix synthesised
 * from five guidance counsellors' expert judgement (thesis §3.5.2).
 * Validates consistency via Consistency Ratio (CR <= 0.10, Saaty 1980).
 *
 * Criteria:
 *   C1 = Academic Performance
 *   C2 = Vocational Interest (RIASEC)
 *   C3 = Personality Traits
 *
 * P0-2 seam: the pairwise matrix is passed IN as a parameter (never
 * imported as a module constant), so the engine can be driven by a
 * versioned AhpWeightSet row and unit-tested against arbitrary matrices.
 * CR > 0.10 THROWS (Saaty rejection). The `consistent` flag is therefore
 * always true on a returned result.
 */

import type { AhpResult } from "@/types/domain.js";

// ── Saaty Random Index table (n = 1 to 10) ─────────────────
const RANDOM_INDEX: number[] = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

/** Canonical criterion labels (kept adjacent to the matrix for provenance). */
export const DEFAULT_CRITERION_LABELS: [string, string, string] = [
  "Academic Performance",
  "Vocational Interest (RIASEC)",
  "Personality Traits",
];

/**
 * Expert-derived pairwise matrix (thesis §3.5.2, 5 guidance counsellors):
 *        C1    C2    C3
 *   C1 [  1,    2,    3  ]
 *   C2 [ 1/2,   1,    2  ]
 *   C3 [ 1/3,  1/2,   1  ]
 *
 * Expected derived weights: ω1 ≈ 0.540, ω2 ≈ 0.297, ω3 ≈ 0.163 (CR ≈ 0.007).
 * This constant is the SEED source for the versioned AhpWeightSet table
 * (see prisma/seed.ts). The engine itself never imports it at runtime.
 */
export const DEFAULT_PAIRWISE_MATRIX: number[][] = [
  [1, 2, 3],
  [1 / 2, 1, 2],
  [1 / 3, 1 / 2, 1],
];

/**
 * Compute AHP weights and validate consistency.
 *
 * @param pairwiseMatrix - square Saaty ratio-scale matrix (n x n)
 * @param labels         - criterion labels (default: the three DSS criteria)
 * @param maxCr          - consistency threshold (Saaty 1980 default 0.10)
 * @throws when CR exceeds maxCr (inconsistent judgement matrix)
 */
export function computeAhpWeights(
  pairwiseMatrix: number[][] = DEFAULT_PAIRWISE_MATRIX,
  labels: [string, string, string] = DEFAULT_CRITERION_LABELS,
  maxCr = 0.1
): AhpResult {
  const n = pairwiseMatrix.length;
  if (n === 0 || pairwiseMatrix.some((row) => row.length !== n)) {
    throw new Error(
      `AHP: pairwise matrix must be square and non-empty (received ${n} x ${pairwiseMatrix
        .map((r) => r.length)
        .join(",")})`
    );
  }

  // Step 1: Column sums
  const colSums = Array(n).fill(0) as number[];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cell = pairwiseMatrix[i]![j];
      if (typeof cell === "number") {
        colSums[j] = (colSums[j] ?? 0) + cell;
      }
    }
  }

  // Step 2: Normalise each cell by its column sum
  const normalised = pairwiseMatrix.map((row) => row.map((val, j) => val / colSums[j]!));

  // Step 3: Priority vector = row averages of normalised matrix
  const weights = normalised.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum / n;
  });

  // Step 4: Compute lambda_max
  const weightedSumVector = pairwiseMatrix.map((row) =>
    row.reduce((sum, val, j) => sum + val * weights[j]!, 0)
  );
  const lambdaValues = weightedSumVector.map((val, i) => val / weights[i]!);
  const lambdaMax = lambdaValues.reduce((a, b) => a + b, 0) / n;

  // Step 5: Consistency Index
  const ci = (lambdaMax - n) / (n - 1);

  // Step 6: Consistency Ratio
  const ri = RANDOM_INDEX[n] ?? 1.49;
  const cr = ri === 0 ? 0 : ci / ri;

  // P0-2a: Saaty rejection. An inconsistent matrix must not silently
  // produce weights. Throwing here makes the CR guard testable and
  // prevents a bad weight set from ever being persisted as active.
  if (cr > maxCr) {
    throw new Error(
      `AHP: Consistency Ratio ${cr.toFixed(4)} exceeds the ${maxCr} threshold (Saaty 1980). ` +
        `Rejecting the pairwise matrix. Judgements must be revised.`
    );
  }

  return {
    weights: [weights[0]!, weights[1]!, weights[2]!],
    lambda: lambdaMax,
    ci: parseFloat(ci.toFixed(4)),
    cr: parseFloat(cr.toFixed(4)),
    consistent: true, // guaranteed. CR > maxCr throws above
    labels,
  };
}
