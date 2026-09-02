import { Router } from "express";
import { submitBFI, getBFI, getBfiQuestions } from "./bfi.controller.js";
import { authenticateToken, requireConsent, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { bfiSubmitSchema } from "@/validators/schemas.js";

export const bfiRoutes = Router();

bfiRoutes.get("/questions", getBfiQuestions); // public - no auth needed
// requireConsent: real psychometric data collection — see auth.middleware.ts.
bfiRoutes.post("/submit", authenticateToken, requireRole(UserRole.STUDENT), requireConsent(), validateBody(bfiSubmitSchema), submitBFI);
bfiRoutes.get("/", authenticateToken, requireRole(UserRole.STUDENT), getBFI);