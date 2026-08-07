/**
 * RE-SCORING ENGINE (P0-5c)
 * ----------------------------------------
 * Version-aware recomputation of RIASEC / BFI profiles from raw response
 * rows. The thesis 100-profile validation study (§3.8) needs a clean entry
 * point that recomputes derived profiles from the raw per-item responses
 * persisted at assessment time. WITHOUT touching Prisma (pure engine).
 *
 * The raw response rows carry questionId + instrumentVersion. Re-scoring is
 * only meaningful when the stored version matches the current instrument, so
 * these helpers accept an optional expected version and refuse mismatches.
 */

import { BFI_QUESTIONS, computeBFI } from "./bfi.js";
import { RIASEC_QUESTIONS, computeRIASEC, type RiasecStreamMapping } from "./riasec.js";
import type { BfiScores, RiasecScores } from "@/types/domain.js";

export interface RawRiasecResponse {
  questionId: number;
  value: number;
  instrumentVersion?: string | null;
}

export interface RawBfiResponse {
  questionId: number;
  value: number;
  reverseKeyed: boolean;
  instrumentVersion?: string | null;
}

/**
 * Recompute a RIASEC profile from raw response rows.
 *
 * @param responses - raw rows as persisted (questionId + Likert value)
 * @param expectedVersion - instrument version the rows must match (e.g. "riasec-v1");
 *                          pass null to skip the version check
 * @param mapping   - versioned RIASEC→stream affinity config
 * @throws if a response's instrumentVersion does not match expectedVersion,
 *         or if fewer than 48 responses are provided
 */
export function rescoreRiasec(
  responses: RawRiasecResponse[],
  expectedVersion: string | null = "riasec-v1",
  mapping?: RiasecStreamMapping
): RiasecScores {
  const byId = new Map(responses.map((r) => [r.questionId, r]));

  if (expectedVersion) {
    // Rows must carry a matching instrumentVersion. A NULL version (legacy
    // pre-versioning data) is also a mismatch — it cannot be trusted to be
    // the current instrument, so refuse rather than silently rescore it.
    const bad = responses.find((r) => (r.instrumentVersion ?? "") !== expectedVersion);
    if (bad) {
      throw new Error(
        `RIASEC re-score refused: response ${bad.questionId} has instrumentVersion "${bad.instrumentVersion ?? "NULL"}", expected "${expectedVersion}".`
      );
    }
  }

  // Order by question id 1..48 so the engine's positional array lines up.
  const values = RIASEC_QUESTIONS.map((q) => {
    const row = byId.get(q.id);
    if (!row) throw new Error(`RIASEC re-score failed: missing response for question ${q.id}.`);
    return row.value;
  });

  return computeRIASEC(values, mapping);
}

/**
 * Recompute a BFI profile from raw response rows.
 *
 * @param responses - raw rows as persisted (questionId + Likert value)
 * @param expectedVersion - instrument version the rows must match (e.g. "bfi-v1");
 *                          pass null to skip the version check
 * @throws if a response's instrumentVersion does not match expectedVersion,
 *         or if fewer than 20 responses are provided
 */
export function rescoreBfi(
  responses: RawBfiResponse[],
  expectedVersion: string | null = "bfi-v1"
): BfiScores {
  const byId = new Map(responses.map((r) => [r.questionId, r]));

  if (expectedVersion) {
    // Rows must carry a matching instrumentVersion. A NULL version (legacy
    // pre-versioning data) is also a mismatch — it cannot be trusted to be
    // the current instrument, so refuse rather than silently rescore it.
    const bad = responses.find((r) => (r.instrumentVersion ?? "") !== expectedVersion);
    if (bad) {
      throw new Error(
        `BFI re-score refused: response ${bad.questionId} has instrumentVersion "${bad.instrumentVersion ?? "NULL"}", expected "${expectedVersion}".`
      );
    }
  }

  // Order by question id 1..20 so the engine's positional array lines up.
  const values = BFI_QUESTIONS.map((q) => {
    const row = byId.get(q.id);
    if (!row) throw new Error(`BFI re-score failed: missing response for question ${q.id}.`);
    return row.value;
  });

  return computeBFI(values);
}
