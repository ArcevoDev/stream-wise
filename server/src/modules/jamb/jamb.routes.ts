import { Router } from "express";
import { validateCombination, getCatalog, getValidationHistory } from "./jamb.controller.js";
import { authenticateToken, requireRole, validateBody, validateQuery } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { jambValidateSchema, jambCatalogQuerySchema } from "@/validators/schemas.js";

export const jambRoutes = Router();

// validateQuery catches malformed query params before they reach the controller.
jambRoutes.get("/catalog", validateQuery(jambCatalogQuerySchema), getCatalog); // public catalog (read-only)
// P1-4: validate + history operate on the caller's own student record.
jambRoutes.post("/validate", authenticateToken, requireRole(UserRole.STUDENT), validateBody(jambValidateSchema), validateCombination);
jambRoutes.get("/history", authenticateToken, requireRole(UserRole.STUDENT), getValidationHistory);