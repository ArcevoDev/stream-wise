import { describe, expect, it } from "vitest";
import { validateJambPrerequisites, type JambRequirement } from "./jamb.js";

const MEDICINE: JambRequirement = {
  courseId: "course-1",
  courseName: "Medicine and Surgery",
  stream: "Science",
  mandatorySubjects: ["BIOLOGY", "CHEMISTRY", "PHYSICS"],
  admissionCycle: "2025/2026",
};

describe("validateJambPrerequisites", () => {
  it("flags a compliant combination", () => {
    const result = validateJambPrerequisites(
      "Science",
      "doctor",
      MEDICINE,
      ["BIOLOGY", "CHEMISTRY", "PHYSICS", "ENGLISH", "MATHEMATICS"]
    );
    expect(result.compliant).toBe(true);
    expect(result.missingSubjects).toEqual([]);
    expect(result.coverage).toBe(1);
  });

  it("reports missing subjects for a non-compliant combination", () => {
    const result = validateJambPrerequisites(
      "Science",
      "doctor",
      MEDICINE,
      ["BIOLOGY", "ENGLISH"]
    );
    expect(result.compliant).toBe(false);
    expect(result.missingSubjects).toEqual(["CHEMISTRY", "PHYSICS"]);
    expect(result.coverage).toBeCloseTo(1 / 3, 2);
  });

  it("is a pure set-difference — careerGoal never affects compliance (spec contract)", () => {
    const goal = "doctor";
    const noGoal = validateJambPrerequisites("Science", undefined, MEDICINE, ["BIOLOGY"]);
    const withGoal = validateJambPrerequisites("Science", goal, MEDICINE, ["BIOLOGY"]);
    expect(noGoal.compliant).toBe(withGoal.compliant);
    expect(noGoal.missingSubjects).toEqual(withGoal.missingSubjects);
  });

  it("adds an advisory alignment note only when a career goal exists", () => {
    const withGoal = validateJambPrerequisites("Business", "lawyer", MEDICINE, ["BIOLOGY", "CHEMISTRY", "PHYSICS"]);
    expect(withGoal.alignmentNote).toContain("different from your recommended stream");
    expect(withGoal.alignmentNote).toContain("lawyer");

    const noGoal = validateJambPrerequisites("Science", undefined, MEDICINE, ["BIOLOGY", "CHEMISTRY", "PHYSICS"]);
    expect(noGoal.alignmentNote).toBeUndefined();
  });

  it("handles an empty requirements list as fully compliant (coverage 1)", () => {
    const result = validateJambPrerequisites("Science", undefined, { ...MEDICINE, mandatorySubjects: [] }, []);
    expect(result.compliant).toBe(true);
    expect(result.coverage).toBe(1);
  });
});
