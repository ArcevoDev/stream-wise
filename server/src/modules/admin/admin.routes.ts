import { Router } from "express";
import { authenticateToken, requireRole, validateQuery } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import {
  getStats,
  getAnalytics,
  getStudents,
  getStudentDetail,
  getAuditLogs,
  exportCsv,
  rescoreStudent,
} from "./admin.controller.js";
import { adminStudentsQuerySchema, adminAuditQuerySchema } from "@/validators/schemas.js";

export const adminRoutes = Router();

// The staff console is open to every staff role as a READ-ONLY surface
// (ADMIN, SCHOOL_ADMIN, COUNSELOR). A bare 403 on the first /admin/* call
// was bouncing non-ADMIN staff straight back to /login via the axios
// interceptor, which treats 403 as a dead session. Only the mutation
// endpoints (CSV export, re-score) stay ADMIN-only, enforced below.
adminRoutes.use(authenticateToken, requireRole(UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.COUNSELOR));

adminRoutes.get("/stats", getStats);
adminRoutes.get("/analytics", getAnalytics);
adminRoutes.get("/students", validateQuery(adminStudentsQuerySchema), getStudents);
adminRoutes.get("/students/:id", getStudentDetail);
adminRoutes.get("/audit", validateQuery(adminAuditQuerySchema), getAuditLogs);
// Mutations: ADMIN-only (defense in depth : the client hides them for
// non-ADMIN, but the server is the real gate).
adminRoutes.get("/export/csv", requireRole(UserRole.ADMIN), exportCsv);
adminRoutes.post("/rescore/:studentId", requireRole(UserRole.ADMIN), rescoreStudent);
