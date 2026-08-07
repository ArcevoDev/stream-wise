import { Router } from "express";
import { getRecommendation, getHistory } from "./recommend.controller.js";
import { authenticateToken, requireRole, validateQuery } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { recommendHistoryQuerySchema } from "@/validators/schemas.js";

export const recommendRoutes = Router();

// P1-6: generation is a POST. GET had a side effect (wrote a RecommendationLog
// row per call). POST makes the side effect explicit and cache-friendly.
// P1-4: student-owned data. Gate to STUDENT tokens.
recommendRoutes.post("/", authenticateToken, requireRole(UserRole.STUDENT), getRecommendation);
recommendRoutes.get("/history", authenticateToken, requireRole(UserRole.STUDENT), validateQuery(recommendHistoryQuerySchema), getHistory);