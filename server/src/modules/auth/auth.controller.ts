import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { Gender, SSLevel, type UserRole } from "@prisma-client";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import { writeAudit } from "@/services/audit.js";
import type { ConsentInput, LoginInput, RegisterInput } from "@/validators/schemas.js";

interface TokenSubject {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

function signToken(student: TokenSubject): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign(
    { id: student.id, email: student.email, fullName: student.fullName, role: student.role },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"] }
  );
}

/**
 * POST /api/auth/guest: one-click reviewer/visitor session.
 *
 * Mints a short-lived JWT with the synthetic role "GUEST" and NO database
 * row. A guest can only browse the marketing + auth surface: every
 * assessment/admin route sits behind requireRole(STUDENT|staff), which
 * rejects "GUEST", so a guest token can never read or write student data.
 * This exists so a supervisor/reviewer can poke around the app without
 * creating an account. Tokens are deliberately short-lived (24h).
 */
export const guestLogin = asyncHandler(async (_req: Request, res: Response) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    return;
  }

  const token = jwt.sign(
    {
      id: "guest",
      email: "guest@streamwise.app",
      fullName: "Guest Reviewer",
      role: "GUEST",
    },
    secret,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    student: {
      id: "guest",
      fullName: "Guest Reviewer",
      email: "guest@streamwise.app",
      role: "GUEST",
    },
    guest: true,
  });
});

export const register = asyncHandler<Request<Record<string, never>, unknown, RegisterInput>>(
  async (req, res: Response) => {
    const {
      fullName,
      email,
      password,
      gender,
      ssLevel,
      phoneNumber,
      careerAspiration,
      schoolName,
      dateOfBirth,
    } = req.body;

    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // schoolName gets a real School row linked via the schoolId FK, so it
    // never pollutes careerAspiration (which feeds the JAMB validator).
    let schoolId: string | null = null;
    if (schoolName?.trim()) {
      const trimmed = schoolName.trim();
      const existing = await prisma.school.findUnique({ where: { name: trimmed } });
      const school = existing ?? (await prisma.school.create({ data: { name: trimmed } }));
      schoolId = school.id;
    }

    const student = await prisma.student.create({
      data: {
        fullName,
        email,
        passwordHash,
        gender: gender ? Gender[gender as keyof typeof Gender] : Gender.UNSPECIFIED,
        ssLevel: ssLevel ? SSLevel[ssLevel as keyof typeof SSLevel] : SSLevel.SS2,
        phoneNumber: phoneNumber ?? null,
        careerAspiration: careerAspiration?.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        schoolId,
      },
    });

    const token = signToken(student);
    res.status(201).json({
      token,
      student: { id: student.id, fullName: student.fullName, email: student.email, role: student.role },
    });
  }
);

export const login = asyncHandler<Request<Record<string, never>, unknown, LoginInput>>(
  async (req, res: Response) => {
    const { email, password } = req.body;

    const student = await prisma.student.findUnique({ where: { email } });
    if (!student) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // P1-2: update lastLoginAt on every successful login
    await prisma.student.update({
      where: { id: student.id },
      data: { lastLoginAt: new Date() },
    });

    // P1-2: audit the successful login. The actor IS the student (there's no
    // token on req yet : login happens before signToken), so attribute the
    // action to them explicitly rather than relying on req.student.
    await writeAudit(req, {
      action: "LOGIN",
      studentId: student.id,
      actorId: student.id,
      actorRole: student.role,
    });

    const token = signToken(student);
    res.json({ token, student: { id: student.id, fullName: student.fullName, email: student.email, role: student.role } });
  }
);

/** GET /api/auth/profile: the signed-in user's identity + consent status. */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({
    where: { id: req.student!.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      gender: true,
      ssLevel: true,
      phoneNumber: true,
      careerAspiration: true,
      role: true,
      schoolId: true,
      consentStatus: true,
      consentVersion: true,
      consentGrantedAt: true,
      createdAt: true,
    },
  });
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // P0-4a: the client gates the assessment flow on consent. Expose the
  // derived flag so the router can redirect to /consent in one place
  // instead of re-deriving the rule per page.
  const consentRequired = student.consentStatus !== "granted";

  res.json({ student, consentRequired });
});

/**
 * GET /api/auth/progress: the furthest assessment step a student has
 * completed, derived from server-side rows (single source of truth).
 *
 *   "consent"     → hasn't granted consent yet (the gate)
 *   "scores"      → scores saved, no RIASEC profile yet
 *   "riasec"      → RIASEC done, no BFI profile yet
 *   "personality" → BFI done, no recommendation yet
 *   "results"     → recommendation exists (has a history row)
 *
 * Used by the client's resume-step routing so a student who logged out
 * mid-assessment is routed back to where they stopped.
 */
export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.student!.id;

  const [student, profile, riasec, personality, recommendation] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { consentStatus: true },
    }),
    prisma.academicProfile.findUnique({ where: { studentId }, select: { id: true } }),
    prisma.riasecProfile.findUnique({ where: { studentId }, select: { id: true } }),
    prisma.personalityProfile.findUnique({ where: { studentId }, select: { id: true } }),
    prisma.recommendationLog.findFirst({
      where: { studentId },
      orderBy: { generatedAt: "desc" },
      select: { id: true },
    }),
  ]);

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const step =
    student.consentStatus !== "granted"
      ? "consent"
      : !profile
        ? "scores"
        : !riasec
          ? "riasec"
          : !personality
            ? "personality"
            : recommendation
              ? "results"
              : "personality";

  res.json({ step });
});

/**
 * POST /api/auth/consent. P0-4a consent recording (ethics requirement).
 * All four consent points must be true to record consent as "granted";
 * anything less is recorded as "withdrawn" so the assessment flow can
 * re-prompt. The consentVersion pins which wording the student agreed to.
 */
export const recordConsent = asyncHandler<Request<Record<string, never>, unknown, ConsentInput>>(
  async (req, res: Response) => {
    const studentId = req.student!.id;
    const { consentPoint1, consentPoint2, consentPoint3, consentPoint4, consentVersion } = req.body;

    const allGranted = consentPoint1 && consentPoint2 && consentPoint3 && consentPoint4;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        consentPoint1,
        consentPoint2,
        consentPoint3,
        consentPoint4,
        consentVersion,
        consentStatus: allGranted ? "granted" : "withdrawn",
        consentGrantedAt: allGranted ? new Date() : null,
      },
    });

    // Consent is the ethics backbone of the study: record it in the audit
    // trail so the four granted points + version are reconstructable.
    await writeAudit(req, {
      action: "CONSENT_RECORDED",
      studentId,
      metadata: {
        consentStatus: student.consentStatus,
        consentVersion: student.consentVersion ?? null,
        points: { consentPoint1, consentPoint2, consentPoint3, consentPoint4 },
      },
    });

    res.json({
      consentStatus: student.consentStatus,
      consentVersion: student.consentVersion,
      consentGrantedAt: student.consentGrantedAt,
    });
  }
);