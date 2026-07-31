import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { Gender, SSLevel, type UserRole } from "@prisma-client";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "@/middleware/index.js";
import type { LoginInput, RegisterInput } from "@/validators/schemas.js";

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

    // FIX (Bug 2.1): schoolName has no direct column on Student (it links via
    // schoolId FK for a School entity). For now we store it as a prefixed note
    // in careerAspiration so the information is not lost. If the student also
    // supplies careerAspiration, we concatenate both values.
    const resolvedCareerAspiration = [
      schoolName ? `[School: ${schoolName}]` : null,
      careerAspiration ?? null,
    ]
      .filter(Boolean)
      .join(" — ") || undefined;

    const student = await prisma.student.create({
      data: {
        fullName,
        email,
        passwordHash,
        gender: gender ? Gender[gender as keyof typeof Gender] : Gender.UNSPECIFIED,
        ssLevel: ssLevel ? SSLevel[ssLevel as keyof typeof SSLevel] : SSLevel.SS2,
        phoneNumber: phoneNumber ?? null,
        careerAspiration: resolvedCareerAspiration ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
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

    // FIX (Bug 2.5): update lastLoginAt on every successful login
    await prisma.student.update({
      where: { id: student.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken(student);
    res.json({ token, student: { id: student.id, fullName: student.fullName, email: student.email, role: student.role } });
  }
);

export const getMe = asyncHandler(async (req: Request, res: Response) => {
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
      createdAt: true,
    },
  });
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({ student });
});