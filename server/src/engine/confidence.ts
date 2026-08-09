/**
 * CONFIDENCE & GUIDANCE INSIGHTS ENGINE
 * ----------------------------------------
 * Generates plain-language explanation of the DSS recommendation.
 * Maps top stream + RIASEC Summary Code to human-readable guidance.
 *
 * P0-3c. CONFIDENCE RESCALING ("why 50 minimum"): the raw confidence level
 * is the top stream's share of total SAW score (rawCL ∈ [1/3, 1] for three
 * streams. 1/3 is the "all equal" baseline). For display we min-max rescale
 * rawCL to [0.50, 1.00] so a displayed percentage is always interpretable:
 * the 1/3 baseline (perfect tie) maps to 50%, and a dominant profile maps
 * toward 100%. 50 is therefore a documented DISPLAY anchor, not a magic
 * number. It represents "no better than a coin flip between the three
 * streams." The UI should surface this as "confidence is relative to the
 * three-stream baseline."
 */

import type { RiasecLetter, SawResult, Stream } from "@/types/domain.js";

/**
 * P0-2d: per-criterion contribution breakdown for a stream.
 * Each entry is the absolute weighted contribution of one criterion to the
 * stream's SAW score (weight × normalised sub-score), which lets the UI and
 * audit trail show WHY a stream ranked where it did.
 */
export interface CriterionContribution {
  criterion: "Academic" | "RIASEC" | "Personality";
  weight: number;
  normalised: number;
  /** weight × normalised. This criterion's contribution to the stream score. */
  contribution: number;
}

export interface StreamContribution {
  stream: Stream;
  score: number;
  contributions: CriterionContribution[];
}

/**
 * Compute the per-criterion contribution breakdown for every stream.
 * Feeds `guidanceInsight` and the explainability snapshot (P0-2d).
 *
 * The SAW engine uses unit weights on normalised inputs (see computeSAW), so
 * a criterion's contribution to a stream score IS its normalised sub-score.
 * This breakdown surfaces the raw normalised values plus the weighted
 * contribution for display, and stays in sync with the engine's math.
 */
export function explainRecommendation(
  sawResult: SawResult,
  weights?: [number, number, number]
): StreamContribution[] {
  const n = sawResult.normalised;

  const perStream = (stream: Stream): { criterion: CriterionContribution["criterion"]; normalised: number }[] => {
    switch (stream) {
      case "Science":
        return [
          { criterion: "Academic", normalised: n.academicScience },
          { criterion: "RIASEC", normalised: n.riasecScience },
          { criterion: "Personality", normalised: n.personalityScience },
        ];
      case "Humanities":
        return [
          { criterion: "Academic", normalised: n.academicHumanities },
          { criterion: "RIASEC", normalised: n.riasecHumanities },
          { criterion: "Personality", normalised: n.personalityHumanities },
        ];
      case "Business":
        return [
          { criterion: "Academic", normalised: n.academicBusiness },
          { criterion: "RIASEC", normalised: n.riasecBusiness },
          { criterion: "Personality", normalised: n.personalityBusiness },
        ];
    }
  };

  const weightFor = (criterion: CriterionContribution["criterion"]): number => {
    if (!weights) return 1; // unit weights. Normalised value IS the contribution
    const idx = criterion === "Academic" ? 0 : criterion === "RIASEC" ? 1 : 2;
    return weights[idx]!;
  };

  return sawResult.ranked.map((s) => {
    const rows = perStream(s.stream);
    return {
      stream: s.stream,
      score: s.score,
      contributions: rows.map((r) => {
        const weight = weightFor(r.criterion);
        return {
          criterion: r.criterion,
          weight,
          normalised: r.normalised,
          contribution: parseFloat((r.normalised * weight).toFixed(4)),
        };
      }),
    };
  });
}

interface StreamDescription {
  subjects: string;
  careers: string;
  trait: string;
}

const STREAM_DESCRIPTIONS: Record<Stream, StreamDescription> = {
  Science: {
    subjects: "Biology, Chemistry, and Physics",
    careers: "Medicine, Engineering, Pharmacy, Computer Science, Biochemistry",
    trait: "analytical and investigative",
  },
  Humanities: {
    subjects: "Literature in English, Government, and either History or CRS/IRS",
    careers: "Law, Journalism, Mass Communication, Education, International Relations",
    trait: "creative and people-oriented",
  },
  Business: {
    subjects: "Economics, Commerce, and Accounting",
    careers: "Accounting, Business Administration, Banking & Finance, Marketing, Economics",
    trait: "organised and enterprising",
  },
};

const RIASEC_DESCRIPTIONS: Record<RiasecLetter, string> = {
  R: "practical and hands-on",
  I: "investigative and scientific",
  A: "artistic and imaginative",
  S: "socially oriented and empathetic",
  E: "enterprising and leadership-driven",
  C: "conventional and detail-focused",
};

/**
 * Generate Guidance Insight text from recommendation output.
 */
export function generateGuidanceInsight(
  topStream: Stream,
  summaryCode: string,
  confidenceLevel: number,
  academicScore: number,
  sawResult: SawResult
): string {
  const sd = STREAM_DESCRIPTIONS[topStream];
  const primaryType = summaryCode[0] as RiasecLetter | undefined;
  const typeDesc = (primaryType && RIASEC_DESCRIPTIONS[primaryType]) || "well-rounded";

  const ranked = sawResult.ranked;
  const second = ranked[1]?.stream ?? "";
  const vTop = ((ranked[0]?.score ?? 0) * 100).toFixed(1);
  const vSec = ((ranked[1]?.score ?? 0) * 100).toFixed(1);

  const academicComment =
    academicScore >= 70
      ? "Your academic performance is strong"
      : academicScore >= 55
        ? "Your academic performance is satisfactory"
        : "Your academic performance indicates room for growth";

  // Confidence is on the DISPLAY scale [50, 100] (P0-3c): 50 = the "all
  // streams tied" baseline. Thresholds below are tuned to that scale, not a
  // generic 0-100, so a near-baseline result reads as "some overlap" rather
  // than a misleading "low confidence".
  const confidenceComment =
    confidenceLevel >= 80
      ? "with a strong signal"
      : confidenceLevel >= 65
        ? "with a clear signal"
        : "though your profile shows some overlap with other streams";

  const insight = [
    `Based on your profile, the DSS recommends the ${topStream} Stream ${confidenceComment} (Confidence Level: ${confidenceLevel}%).`,
    ``,
    `${academicComment}, contributing a weighted academic score of ${academicScore.toFixed(1)}/100.`,
    `Your RIASEC profile (${summaryCode}) indicates a dominant ${typeDesc} personality type, which aligns strongly with the ${topStream} stream environment.`,
    ``,
    `In the ${topStream} Stream, you will study ${sd.subjects} as your core elective subjects.`,
    `This stream opens pathways to careers in: ${sd.careers}.`,
    ``,
    `Stream ranking: ${topStream} (${vTop}) > ${second} (${vSec}).`,
    ``,
    `Note: This recommendation is a data-driven guide. Please discuss your final decision with a qualified guidance counsellor and your parents or guardians.`,
  ].join("\n");

  return insight;
}