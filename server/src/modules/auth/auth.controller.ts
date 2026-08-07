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
      const existing = await prisma.school.findFirst({ where: { name: trimmed } });
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

    // P1-2: audit the successful login (best-effort, never breaks the response).
    await writeAudit(req, { action: "LOGIN", studentId: student.id });

    const token = signToken(student);
    res.json({ token, student: { id: student.id, fullName: student.fullName, email: student.email, role: student.role } });
  }
);

/** GET /api/auth/profile — the signed-in user's identity + consent status. */
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
      counselorId: true,
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

    res.json({
      consentStatus: student.consentStatus,
      consentVersion: student.consentVersion,
      consentGrantedAt: student.consentGrantedAt,
    });
  }
);