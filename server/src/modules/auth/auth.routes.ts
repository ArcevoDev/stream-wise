import { Router } from "express";
import { register, login, getProfile, recordConsent, getProgress, guestLogin } from "./auth.controller.js";
import { authenticateToken, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { loginSchema, registerSchema, consentSchema } from "@/validators/schemas.js";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), register);
authRoutes.post("/login", validateBody(loginSchema), login);
// Guest (reviewer) session: no credentials, no DB row. Role "GUEST" is
// rejected by every requireRole(...) so guests stay on marketing + auth.
authRoutes.post("/guest", guestLogin);

// /consent + /profile are identity endpoints: STUDENT, COUNSELOR, SCHOOL_ADMIN
// and ADMIN all need them (counselor portal reads /profile; consent is
// self-recorded by the token holder: there is no on-behalf path today).
// authenticateToken alone is the correct guard here.
authRoutes.post("/consent", authenticateToken, validateBody(consentSchema), recordConsent);
authRoutes.get("/profile", authenticateToken, getProfile);
// Resume-step routing: STUDENT-only (staff have their own console landing).
authRoutes.get("/progress", authenticateToken, requireRole(UserRole.STUDENT), getProgress);

// P1-4: /role is a STUDENT-only utility. The role claim check lets a
// counselor/admin token confirm its own role without exposing student data.
authRoutes.get("/role", authenticateToken, requireRole(UserRole.STUDENT, UserRole.COUNSELOR, UserRole.SCHOOL_ADMIN, UserRole.ADMIN), (req, res) => {
  res.json({ role: req.student?.role });
});
