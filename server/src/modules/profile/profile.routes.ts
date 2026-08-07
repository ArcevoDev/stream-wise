import { Router } from "express";
import { saveScores, getProfile } from "./profile.controller.js";
import { authenticateToken, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { academicScoresSchema } from "@/validators/schemas.js";

export const profileRoutes = Router();

// P1-4: student-owned data. Gate to STUDENT tokens. (Counselor/admin views
// of a student's profile use the /api/admin routes, not this one.)
profileRoutes.post("/scores", authenticateToken, requireRole(UserRole.STUDENT), validateBody(academicScoresSchema), saveScores);
profileRoutes.get("/", authenticateToken, requireRole(UserRole.STUDENT), getProfile);