import type { Request, Response } from "express";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { writeAudit } from "@/services/audit.js";
import { AcademicLevel, AcademicStream } from "@prisma-client";
import { validateJambPrerequisites } from "@/engine/index.js";
import type { Subject } from "@prisma-client";
import type {
  JambCatalogQueryInput,
  JambValidateInput,
} from "@/validators/schemas.js";

/**
 * Fetches the available JAMB courses, optionally filtered by Academic Stream or Faculty Area.
 */
export const getCatalog = asyncHandler<
  Request<Record<string, never>, unknown, unknown, JambCatalogQueryInput>
>(async (req, res: Response) => {
  const { stream, faculty } = req.query;

  const courses = await prisma.jambCourse.findMany({
    where: {
      streamCategory: stream
        ? AcademicStream[stream as keyof typeof AcademicStream]
        : undefined,
      facultyArea: faculty
        ? {
            contains: faculty,
            mode: "insensitive",
          }
        : undefined,
    },
    include: {
      mandatorySubjects: true,
    },
    orderBy: {
      courseName: "asc",
    },
  });

  res.json({
    courses,
    total: courses.length,
  });
});

/**
 * Validates a student's chosen subjects against a target JAMB course's requirements.
 * P0-2c: the compliance math is delegated to the pure engine module
 * (validateJambPrerequisites); the controller only fetches the versioned
 * requirements and persists the result.
 */
export const validateCombination = asyncHandler<
  Request<Record<string, never>, unknown, JambValidateInput>
>(async (req, res: Response) => {
  const studentId = req.student!.id;
  const { jambCourseId, studentSubjects } = req.body;

  const course = await prisma.jambCourse.findUnique({
    where: { id: jambCourseId },
    include: { mandatorySubjects: true },
  });

  if (!course) {
    res.status(404).json({
      error: `JAMB course with id "${jambCourseId}" was not found`,
    });
    return;
  }

  // Student's REAL career aspiration (spec: validateJambPrerequisites takes careerGoal).
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { careerAspiration: true },
  });

  // P1-3: source the student's subject combination from their REAL
  // SubjectScore rows (SS1) when the client does not send an explicit list.
  // This kills the hardcoded STREAM_SUBJECTS-template loophole. A student
  // can no longer "pass" validation with subjects they never actually took.
  let effectiveSubjects: Subject[];
  if (studentSubjects && studentSubjects.length > 0) {
    effectiveSubjects = studentSubjects as Subject[];
  } else {
    const rows = await prisma.subjectScore.findMany({
      where: { studentId, level: AcademicLevel.SS1 },
      orderBy: { subject: "asc" },
    });
    if (rows.length === 0) {
      res.status(400).json({
        error:
          "No SS1 subject scores found for this student. Submit your academic scores first, or provide an explicit subject list.",
      });
      return;
    }
    effectiveSubjects = rows.map((row) => row.subject);
  }

  const required: Subject[] = course.mandatorySubjects.map(
    (subjectRow: { subject: Subject }): Subject => subjectRow.subject
  );

  const result = validateJambPrerequisites(
    course.streamCategory,
    student?.careerAspiration ?? undefined,
    {
      courseId: course.id,
      courseName: course.courseName,
      stream: course.streamCategory,
      mandatorySubjects: required,
      admissionCycle: course.admissionCycle,
    },
    effectiveSubjects
  );

  const validation = await prisma.jambValidation.create({
    data: {
      studentId,
      jambCourseId: course.id,
      recommendedStream: course.streamCategory,
      isCompliant: result.compliant,
      missingSubjects: result.missingSubjects,
      validationNotes: result.compliant
        ? `All ${result.requiredSubjects.length} mandatory subjects satisfied for ${course.courseName}.`
        : `Missing ${result.missingSubjects.length} of ${result.requiredSubjects.length} mandatory subjects for ${course.courseName}.`,
    },
  });

  // P1-2: audit the JAMB validation.
  await writeAudit(req, {
    action: "JAMB_VALIDATED",
    studentId,
    metadata: {
      courseId: course.id,
      courseName: course.courseName,
      admissionCycle: course.admissionCycle,
      compliant: result.compliant,
      coverage: result.coverage,
      missingSubjects: result.missingSubjects,
      validationId: validation.id,
      subjectSource: studentSubjects && studentSubjects.length > 0 ? "client-supplied" : "subject-score-rows",
    },
  });

  res.json({
    course: course.courseName,
    stream: course.streamCategory,
    admissionCycle: course.admissionCycle,
    mandatorySubjects: result.requiredSubjects,
    studentSubjects: result.studentSubjects,
    compliant: result.compliant,
    coverage: result.coverage,
    missingSubjects: result.missingSubjects,
    alignmentNote: result.alignmentNote,
    subjectSource: studentSubjects && studentSubjects.length > 0 ? "client-supplied" : "subject-score-rows",
    message: result.compliant
      ? `Your subject combination fully satisfies JAMB requirements for ${course.courseName}.`
      : `Missing required subjects for ${course.courseName}: ${result.missingSubjects.join(", ")}.`,
    validationId: validation.id,
  });
});

/**
 * Retrieves the historical validation log trail for the active logged-in student profile.
 */
export const getValidationHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const validations = await prisma.jambValidation.findMany({
      where: {
        studentId: req.student!.id,
      },
      include: {
        jambCourse: true,
      },
      orderBy: {
        validatedAt: "desc",
      },
      take: 10,
    });

    res.json({
      history: validations,
    });
  }
);
