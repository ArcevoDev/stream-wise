/**
 * BFI-20 ENGINE. Big Five Inventory (short form)
 * ----------------------------------------
 * 20-item questionnaire (4 items per trait): Openness, Conscientiousness,
 * Extraversion, Agreeableness, Neuroticism. Thesis §3.5.3 specifies a
 * "20-item BFI sub-scale score, normalised over 100" feeding into the
 * Personality criterion (AHP weight ω3 ≈ 0.163).
 *
 * Likert scale: 1 (Disagree strongly) .. 5 (Agree strongly).
 * Reverse-keyed items are flipped (6 - value) before aggregation, per
 * standard BFI scoring convention (John & Srivastava, 1999).
 *
 * Stream mapping used downstream by the SAW engine (thesis §3.5.3):
 *   Science    draws on Openness + Conscientiousness + Emotional Stability
 *   Humanities draws on Openness + Agreeableness + Emotional Stability
 *   Business   draws on Extraversion + Conscientiousness + Emotional Stability
 * P0-3e: Neuroticism is now a first-class 5-factor input. Inverted as
 * Emotional Stability (100 − neuroticism) and used as a positive driver for
 * every stream (capacity to sustain a demanding workload, §2.3.4). It is no
 * longer "retained for counsellor insight only".
 */

import type { BfiQuestion, BfiScores, BfiTrait } from "@/types/domain.js";

export const BFI_QUESTIONS: BfiQuestion[] = [
  // ── OPENNESS (O) ──
  { id: 1, trait: "O", text: "I have a vivid imagination and enjoy exploring new ideas", reverseKeyed: false },
  { id: 2, trait: "O", text: "I am curious about many different things", reverseKeyed: false },
  { id: 3, trait: "O", text: "I prefer routine and familiar ways of doing things", reverseKeyed: true },
  { id: 4, trait: "O", text: "I enjoy thinking about abstract or philosophical questions", reverseKeyed: false },

  // ── CONSCIENTIOUSNESS (C) ──
  { id: 5, trait: "C", text: "I complete tasks thoroughly and on time", reverseKeyed: false },
  { id: 6, trait: "C", text: "I keep my belongings and schedule well organized", reverseKeyed: false },
  { id: 7, trait: "C", text: "I often leave tasks unfinished or do them at the last minute", reverseKeyed: true },
  { id: 8, trait: "C", text: "I set goals for myself and work steadily toward them", reverseKeyed: false },

  // ── EXTRAVERSION (E) ──
  { id: 9, trait: "E", text: "I feel energized when I am around other people", reverseKeyed: false },
  { id: 10, trait: "E", text: "I am talkative and enjoy starting conversations", reverseKeyed: false },
  { id: 11, trait: "E", text: "I prefer working or spending time alone rather than in groups", reverseKeyed: true },
  { id: 12, trait: "E", text: "I am comfortable being the centre of attention", reverseKeyed: false },

  // ── AGREEABLENESS (A) ──
  { id: 13, trait: "A", text: "I try to be considerate and kind to almost everyone", reverseKeyed: false },
  { id: 14, trait: "A", text: "I find it easy to trust and cooperate with others", reverseKeyed: false },
  { id: 15, trait: "A", text: "I sometimes argue or find fault with others", reverseKeyed: true },
  { id: 16, trait: "A", text: "I am willing to help classmates even at a cost to myself", reverseKeyed: false },

  // ── NEUROTICISM (N) ──
  { id: 17, trait: "N", text: "I worry a lot about things that might go wrong", reverseKeyed: false },
  { id: 18, trait: "N", text: "I remain calm and relaxed even in stressful situations", reverseKeyed: true },
  { id: 19, trait: "N", text: "My mood changes quite easily", reverseKeyed: false },
  { id: 20, trait: "N", text: "I get nervous or anxious easily", reverseKeyed: false },
];

const TRAITS: BfiTrait[] = ["O", "C", "E", "A", "N"];

/**
 * Compute BFI-20 trait scores from 20 responses.
 * @param responses - array of 20 values, each 1-5 (Likert scale), in question-id order (1..20)
 */
export function computeBFI(responses: number[]): BfiScores {
  if (responses.length !== 20) {
    throw new Error(`Expected 20 responses, received ${responses.length}`);
  }

  const rawScores: Record<BfiTrait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  BFI_QUESTIONS.forEach((q, idx) => {
    const raw = responses[idx]!;
    if (raw < 1 || raw > 5) {
      throw new Error(`Response at question ${q.id} out of range (1-5): received ${raw}`);
    }
    const keyed = q.reverseKeyed ? 6 - raw : raw;
    rawScores[q.trait] += keyed;
  });

  // Max raw score per trait = 4 items × 5 = 20. Normalise to 0-100.
  const normalised: Record<BfiTrait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  TRAITS.forEach((t) => {
    normalised[t] = parseFloat(((rawScores[t] / 20) * 100).toFixed(1));
  });

  return {
    opennessScore: normalised.O,
    conscientiousnessScore: normalised.C,
    extraversionScore: normalised.E,
    agreeablenessScore: normalised.A,
    neuroticismScore: normalised.N,
    // P0-3e: derived 5-factor input. The inverse of neuroticism, used by the
    // SAW personality criterion as a positive driver for every stream.
    emotionalStabilityScore: parseFloat((100 - normalised.N).toFixed(1)),
  };
}