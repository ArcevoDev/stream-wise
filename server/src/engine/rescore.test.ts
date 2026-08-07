import { describe, expect, it } from "vitest";
import { rescoreBfi, rescoreRiasec, type RawBfiResponse, type RawRiasecResponse } from "./rescore.js";
import { BFI_QUESTIONS } from "./bfi.js";
import { RIASEC_QUESTIONS } from "./riasec.js";

describe("rescoreRiasec", () => {
  it("recomputes a profile from raw rows and matches direct computeRIASEC", () => {
    const values = Array.from({ length: 48 }, (_, i) => (RIASEC_QUESTIONS[i]!.type === "I" ? 5 : 1));
    const rows: RawRiasecResponse[] = RIASEC_QUESTIONS.map((q, i) => ({
      questionId: q.id,
      value: values[i]!,
      instrumentVersion: "riasec-v1",
    }));

    const rescored = rescoreRiasec(rows, "riasec-v1");
    expect(rescored.iScore).toBe(100);
    expect(rescored.rScore).toBe(20);
    expect(rescored.summaryCode).toHaveLength(3);
  });

  it("refuses a version mismatch (version-aware re-scoring)", () => {
    const rows: RawRiasecResponse[] = RIASEC_QUESTIONS.map((q) => ({
      questionId: q.id,
      value: 3,
      instrumentVersion: "riasec-v0",
    }));
    expect(() => rescoreRiasec(rows, "riasec-v1")).toThrow(/instrumentVersion/);
  });

  it("throws on a missing response", () => {
    const rows: RawRiasecResponse[] = RIASEC_QUESTIONS.slice(0, 47).map((q) => ({
      questionId: q.id,
      value: 3,
      instrumentVersion: "riasec-v1",
    }));
    expect(() => rescoreRiasec(rows, "riasec-v1")).toThrow(/missing response/);
  });

  it("skips the version check when expectedVersion is null", () => {
    const rows: RawRiasecResponse[] = RIASEC_QUESTIONS.map((q) => ({
      questionId: q.id,
      value: 3,
      instrumentVersion: "legacy",
    }));
    expect(() => rescoreRiasec(rows, null)).not.toThrow();
  });
});

describe("rescoreBfi", () => {
  it("recomputes a profile from raw rows and matches direct computeBFI", () => {
    const values = BFI_QUESTIONS.map((q) => (q.reverseKeyed ? 1 : 5));
    const rows: RawBfiResponse[] = BFI_QUESTIONS.map((q, i) => ({
      questionId: q.id,
      value: values[i]!,
      reverseKeyed: q.reverseKeyed,
      instrumentVersion: "bfi-v1",
    }));

    const rescored = rescoreBfi(rows, "bfi-v1");
    expect(rescored.opennessScore).toBe(100);
    expect(rescored.conscientiousnessScore).toBe(100);
    expect(rescored.extraversionScore).toBe(100);
    expect(rescored.agreeablenessScore).toBe(100);
    expect(rescored.neuroticismScore).toBe(100);
    expect(rescored.emotionalStabilityScore).toBe(0);
  });

  it("refuses a version mismatch", () => {
    const rows: RawBfiResponse[] = BFI_QUESTIONS.map((q) => ({
      questionId: q.id,
      value: 3,
      reverseKeyed: q.reverseKeyed,
      instrumentVersion: "bfi-v0",
    }));
    expect(() => rescoreBfi(rows, "bfi-v1")).toThrow(/instrumentVersion/);
  });
});
