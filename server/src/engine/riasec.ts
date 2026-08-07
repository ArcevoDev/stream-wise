/**
 * RIASEC ENGINE
 * ----------------------------------------
 * 48-item questionnaire (8 items per Holland type).
 * Computes sub-scores, derives 3-letter Summary Code,
 * and maps to stream affinity scores (0-100).
 *
 * Holland Types: R I A S E C
 * Stream Mapping (thesis §3.5.3):
 *   Science    = I (60%, primary) + R (40%, secondary)
 *   Humanities = A (60%, primary) + S (40%, secondary)
 *   Business   = E (60%, primary) + C (40%, secondary)
 */

import type { RiasecLetter, RiasecQuestion, RiasecScores } from "@/types/domain.js";

export const RIASEC_QUESTIONS: RiasecQuestion[] = [
  // ── REALISTIC (R) ──
  { id: 1, type: "R", text: "Build or repair electronic equipment or devices" },
  { id: 2, type: "R", text: "Operate machinery or power tools" },
  { id: 3, type: "R", text: "Work on agricultural or farming activities" },
  { id: 4, type: "R", text: "Install or maintain solar panels or electrical systems" },
  { id: 5, type: "R", text: "Assemble or disassemble mechanical parts" },
  { id: 6, type: "R", text: "Design or construct physical structures or objects" },
  { id: 7, type: "R", text: "Diagnose and fix computer hardware problems" },
  { id: 8, type: "R", text: "Work with your hands to produce or repair practical items" },

  // ── INVESTIGATIVE (I) ──
  { id: 9, type: "I", text: "Conduct scientific experiments or laboratory investigations" },
  { id: 10, type: "I", text: "Study how the human body or biological systems work" },
  { id: 11, type: "I", text: "Analyse data sets to find patterns and draw conclusions" },
  { id: 12, type: "I", text: "Research a topic deeply using books, journals, or the internet" },
  { id: 13, type: "I", text: "Solve complex mathematical or logical problems" },
  { id: 14, type: "I", text: "Explore how chemicals or physical forces interact" },
  { id: 15, type: "I", text: "Develop or test new ideas through systematic investigation" },
  { id: 16, type: "I", text: "Question assumptions and seek evidence before accepting conclusions" },

  // ── ARTISTIC (A) ──
  { id: 17, type: "A", text: "Write stories, poetry, essays, or creative content" },
  { id: 18, type: "A", text: "Draw, paint, or create visual art" },
  { id: 19, type: "A", text: "Perform in a play, musical, or public presentation" },
  { id: 20, type: "A", text: "Design graphics, logos, or visual layouts" },
  { id: 21, type: "A", text: "Express ideas or emotions through music, dance, or drama" },
  { id: 22, type: "A", text: "Develop original and imaginative solutions to problems" },
  { id: 23, type: "A", text: "Appreciate and critically analyse works of art, literature, or music" },
  { id: 24, type: "A", text: "Work in an environment that values creativity and self-expression" },

  // ── SOCIAL (S) ──
  { id: 25, type: "S", text: "Teach or tutor others in subjects you understand well" },
  { id: 26, type: "S", text: "Counsel or support people going through difficulties" },
  { id: 27, type: "S", text: "Organise community events or volunteer activities" },
  { id: 28, type: "S", text: "Work as part of a team to achieve shared goals" },
  { id: 29, type: "S", text: "Listen carefully to others and offer thoughtful advice" },
  { id: 30, type: "S", text: "Advocate for fairness, rights, or social issues" },
  { id: 31, type: "S", text: "Mentor younger students or peers" },
  { id: 32, type: "S", text: "Build and maintain strong personal and professional relationships" },

  // ── ENTERPRISING (E) ──
  { id: 33, type: "E", text: "Lead a group or organisation toward a goal" },
  { id: 34, type: "E", text: "Start or run your own business or project" },
  { id: 35, type: "E", text: "Persuade or negotiate with others to reach an agreement" },
  { id: 36, type: "E", text: "Sell a product or pitch an idea confidently" },
  { id: 37, type: "E", text: "Make decisions quickly under pressure" },
  { id: 38, type: "E", text: "Take on leadership roles in school clubs or projects" },
  { id: 39, type: "E", text: "Compete in debates, business challenges, or pitch competitions" },
  { id: 40, type: "E", text: "Identify opportunities and take initiative to act on them" },

  // ── CONVENTIONAL (C) ──
  { id: 41, type: "C", text: "Keep detailed and organised records or files" },
  { id: 42, type: "C", text: "Follow established procedures and rules carefully" },
  { id: 43, type: "C", text: "Work with numbers, spreadsheets, or financial data" },
  { id: 44, type: "C", text: "Manage schedules, inventories, or administrative tasks" },
  { id: 45, type: "C", text: "Ensure accuracy and correctness in your work" },
  { id: 46, type: "C", text: "Work in a structured and predictable environment" },
  { id: 47, type: "C", text: "Process transactions, accounts, or official documents" },
  { id: 48, type: "C", text: "Organise information systematically for easy retrieval" },
];

const TYPES: RiasecLetter[] = ["R", "I", "A", "S", "E", "C"];

/**
 * P0-1e: RIASEC→stream affinity mapping (thesis §3.5.3) as a versioned
 * config, not a literal baked into the scoring loop. Each stream is a
 * [primary, secondary] Holland-type pair with 60/40 weights.
 */
export interface RiasecStreamMapping {
  science: { primary: RiasecLetter; secondary: RiasecLetter; primaryWeight: number };
  humanities: { primary: RiasecLetter; secondary: RiasecLetter; primaryWeight: number };
  business: { primary: RiasecLetter; secondary: RiasecLetter; primaryWeight: number };
}

export const DEFAULT_RIASEC_STREAM_MAPPING: RiasecStreamMapping = {
  science: { primary: "I", secondary: "R", primaryWeight: 0.6 },
  humanities: { primary: "A", secondary: "S", primaryWeight: 0.6 },
  business: { primary: "E", secondary: "C", primaryWeight: 0.6 },
};

/**
 * Compute RIASEC sub-scores from 48 responses.
 * @param responses - array of 48 values, each 1-5 (Likert scale), in question-id order (1..48)
 * @param mapping   - versioned RIASEC→stream affinity config (defaults to thesis §3.5.3)
 */
export function computeRIASEC(
  responses: number[],
  mapping: RiasecStreamMapping = DEFAULT_RIASEC_STREAM_MAPPING
): RiasecScores {
  if (responses.length !== 48) {
    throw new Error(`Expected 48 responses, received ${responses.length}`);
  }

  const rawScores: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  RIASEC_QUESTIONS.forEach((q, idx) => {
    rawScores[q.type] += responses[idx]!;
  });

  // Max raw score per type = 8 items × 5 = 40. Normalise to 0-100.
  const scores: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  TYPES.forEach((t) => {
    scores[t] = parseFloat(((rawScores[t] / 40) * 100).toFixed(1));
  });

  // Derive 3-letter Summary Code (top 3 types by score, descending)
  const sorted = [...TYPES].sort((a, b) => scores[b] - scores[a]);
  const summaryCode = sorted.slice(0, 3).join("");

  // Stream affinity scores (0-100) from the versioned mapping config.
  const affinity = (cfg: { primary: RiasecLetter; secondary: RiasecLetter; primaryWeight: number }): number =>
    parseFloat((scores[cfg.primary] * cfg.primaryWeight + scores[cfg.secondary] * (1 - cfg.primaryWeight)).toFixed(1));

  const scienceAffinity = affinity(mapping.science);
  const humanitiesAffinity = affinity(mapping.humanities);
  const businessAffinity = affinity(mapping.business);

  return {
    rScore: scores.R,
    iScore: scores.I,
    aScore: scores.A,
    sScore: scores.S,
    eScore: scores.E,
    cScore: scores.C,
    summaryCode,
    scienceAffinity,
    humanitiesAffinity,
    businessAffinity,
  };
}