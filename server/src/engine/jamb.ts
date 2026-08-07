/**
 * JAMB PREREQUISITES ENGINE (P0-2c)
 * ----------------------------------------
 * Pure validation of a student's subject combination against a JAMB course's
 * mandatory O'Level requirements. Extracted from jamb.controller.ts into a
 * dependency-free engine module so it can be unit-tested without Prisma and
 * driven by versioned JambRequirement rows.
 *
 * Spec contract: validateJambPrerequisites(recommendedStream, careerGoal,
 * jambRequirements). The careerGoal is advisory for matching/insight; the
 * compliance decision is purely set-difference over the requirements.
 */

export interface JambRequirement<TSubject extends string = string> {
  courseId: string;
  courseName: string;
  stream: string; // AcademicStream value. Engine keeps it as a plain string
  mandatorySubjects: TSubject[]; // Subject enum values
  admissionCycle?: string;
}

export interface JambValidationResult<TSubject extends string = string> {
  courseId: string;
  courseName: string;
  compliant: boolean;
  missingSubjects: TSubject[];
  requiredSubjects: TSubject[];
  studentSubjects: TSubject[];
  /** Fraction of mandatory subjects satisfied (0..1). Useful for partial-fit messaging. */
  coverage: number;
  /** Career-goal alignment note (advisory only. Never affects compliance). */
  alignmentNote?: string;
}

/**
 * Validate a student's subjects against a course's mandatory requirements.
 *
 * @param recommendedStream - the stream the recommendation suggests (for alignment note)
 * @param careerGoal        - free-text career aspiration (advisory, optional)
 * @param requirements      - the JAMB course + its mandatory subjects (versioned rows)
 * @param studentSubjects   - the student's actual subject combination (Subject enum values)
 */
export function validateJambPrerequisites<TSubject extends string>(
  recommendedStream: string,
  careerGoal: string | undefined,
  requirements: JambRequirement<TSubject>,
  studentSubjects: TSubject[]
): JambValidationResult<TSubject> {
  const required = requirements.mandatorySubjects;
  const studentSet = new Set(studentSubjects);

  const missing = required.filter((subject) => !studentSet.has(subject));
  const isCompliant = missing.length === 0;
  const coverage = required.length === 0 ? 1 : (required.length - missing.length) / required.length;

  let alignmentNote: string | undefined;
  if (careerGoal?.trim()) {
    const streamMatch =
      requirements.stream === recommendedStream
        ? "aligned"
        : "different from your recommended stream";
    alignmentNote = `"${requirements.courseName}" sits in the ${requirements.stream} stream, ${streamMatch} (${recommendedStream}). Your stated career goal: "${careerGoal.trim()}".`;
  }

  return {
    courseId: requirements.courseId,
    courseName: requirements.courseName,
    compliant: isCompliant,
    missingSubjects: missing,
    requiredSubjects: required,
    studentSubjects,
    coverage: parseFloat(coverage.toFixed(2)),
    alignmentNote,
  };
}
