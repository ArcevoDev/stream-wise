import { Router } from "express";
import { saveScores, getProfile } from "./profile.controller.js";
import { authenticateToken, requireConsent, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { academicScoresSchema } from "@/validators/schemas.js";

export const profileRoutes = Router();

// P1-4: student-owned data. Gate to STUDENT tokens. (Counselor/admin views
// of a student's profile use the /api/admin routes, not this one.)
// requireConsent: this is real data collection (consent point 2) — must be
// gated here, not just at recommendation time. See auth.middleware.ts.
profileRoutes.post("/scores", authenticateToken, requireRole(UserRole.STUDENT), requireConsent(), validateBody(academicScoresSchema), saveScores);
profileRoutes.get("/", authenticateToken, requireRole(UserRole.STUDENT), getProfile);