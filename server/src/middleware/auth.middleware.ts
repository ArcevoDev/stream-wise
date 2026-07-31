import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { AuthTokenPayload } from "@/types/express.js";
import { UserRole } from "@prisma-client";

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
 * Role guard — must run AFTER authenticateToken. Rejects the request unless
 * the verified token's role is in the allowed set.
 */
export function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void {
  const allowed = new Set<UserRole>(roles);
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.student?.role;
    if (!role || !allowed.has(role)) {
      res.status(403).json({ error: "Insufficient permissions for this action" });
      return;
    }
    next();
  };
}
