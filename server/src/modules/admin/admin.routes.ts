import { Router } from "express";
import { authenticateToken, requireRole } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { validateQuery } from "@/middleware/index.js";
import {
  getStats,
  getAnalytics,
  getStudents,
  getStudentDetail,
  getAuditLogs,
  exportCsv,
} from "./admin.controller.js";
import { adminStudentsQuerySchema, adminAuditQuerySchema } from "@/validators/schemas.js";

export const adminRoutes = Router();

// Every admin route requires an ADMIN token. The JWT role claim is embedded
// at login/register (auth.controller.ts) and enforced here — students and
// counselors get a 403 before any handler runs.
adminRoutes.use(authenticateToken, requireRole(UserRole.ADMIN));

adminRoutes.get("/stats", getStats);
adminRoutes.get("/analytics", getAnalytics);
adminRoutes.get("/students", validateQuery(adminStudentsQuerySchema), getStudents);
adminRoutes.get("/students/:id", getStudentDetail);
adminRoutes.get("/audit", validateQuery(adminAuditQuerySchema), getAuditLogs);
adminRoutes.get("/export/csv", exportCsv);
