import { Router } from "express";
import { getRecommendation, getHistory, getRecommendationById, clearHistory } from "./recommend.controller.js";
import { authenticateToken, requireRole, validateQuery } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { recommendHistoryQuerySchema } from "@/validators/schemas.js";

export const recommendRoutes = Router();

// P1-6: generation is a POST. GET had a side effect (wrote a RecommendationLog
// row per call). POST makes the side effect explicit and cache-friendly.
// P1-4: student-owned data. Gate to STUDENT tokens.
recommendRoutes.post("/", authenticateToken, requireRole(UserRole.STUDENT), getRecommendation);
// Order matters: the `/history/:id` param route must be registered BEFORE the
// bare `/history` list route so a GET to /history/some-uuid is not swallowed
// by the list handler.
recommendRoutes.get("/history/:id", authenticateToken, requireRole(UserRole.STUDENT), getRecommendationById);
recommendRoutes.get("/history", authenticateToken, requireRole(UserRole.STUDENT), validateQuery(recommendHistoryQuerySchema), getHistory);
recommendRoutes.delete("/history", authenticateToken, requireRole(UserRole.STUDENT), clearHistory);