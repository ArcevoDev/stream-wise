import { Router } from "express";
import { submitBFI, getBFI, getBfiQuestions } from "./bfi.controller.js";
import { authenticateToken, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { bfiSubmitSchema } from "@/validators/schemas.js";

export const bfiRoutes = Router();

bfiRoutes.get("/questions", getBfiQuestions); // public - no auth needed
bfiRoutes.post("/submit", authenticateToken, requireRole(UserRole.STUDENT), validateBody(bfiSubmitSchema), submitBFI);
bfiRoutes.get("/", authenticateToken, requireRole(UserRole.STUDENT), getBFI);