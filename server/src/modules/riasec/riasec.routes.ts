import { Router } from "express";
import { submitRIASEC, getRIASEC, getQuestions } from "./riasec.controller.js";
import { authenticateToken, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { riasecSubmitSchema } from "@/validators/schemas.js";

export const riasecRoutes = Router();

riasecRoutes.get("/questions", getQuestions); // public - no auth needed
riasecRoutes.post("/submit", authenticateToken, requireRole(UserRole.STUDENT), validateBody(riasecSubmitSchema), submitRIASEC);
riasecRoutes.get("/", authenticateToken, requireRole(UserRole.STUDENT), getRIASEC);