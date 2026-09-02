import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { AuthTokenPayload } from "@/types/express.js";
import { UserRole } from "@prisma-client";
import { prisma } from "@/db/prisma.js";
import { asyncHandler } from "./async-handler.js";

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    req.student = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role guard. Must run AFTER authenticateToken. Rejects the request unless
 * the verified token's role is in the allowed set. The payload role is typed
 * `UserRole | "GUEST"`; "GUEST" is never in the allowed set, so it is
 * rejected at runtime exactly as intended.
 */
export function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void {
  const allowed = new Set<AuthTokenPayload["role"]>(roles);
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.student?.role;
    if (!role || !allowed.has(role)) {
      res.status(403).json({ error: "Insufficient permissions for this action" });
      return;
    }
    next();
  };
}

/**
 * Consent guard. Must run AFTER authenticateToken. Previously this check
 * only existed inside getRecommendation (recommend.controller.ts), on the
 * (incorrect) assumption that the client already blocked reaching /scores,
 * /riasec, and /personality without consent. It didn't: PrivateRoute only
 * checks token + role, so a student whose consent save failed, or who
 * deep-links straight to /scores, /riasec, or /personality, could submit
 * real academic scores and psychometric responses with no consent on
 * record — only getting blocked at the final /recommend call. This
 * middleware closes that gap at the actual point of data collection.
 *
 * Does a fresh DB read rather than trusting the JWT payload: consent status
 * is not (and must not be) part of the token claims, since it can change
 * after the token was issued.
 */
export function requireConsent(): (req: Request, res: Response, next: NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const studentId = req.student?.id;
    if (!studentId) {
      res.status(401).json({ error: "Access token required" });
      return;
    }
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { consentStatus: true },
    });
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    if (student.consentStatus !== "granted") {
      res.status(403).json({
        error: "Consent required",
        details: "You must review and agree to the informed consent points before this data can be submitted.",
      });
      return;
    }
    next();
  });
}
