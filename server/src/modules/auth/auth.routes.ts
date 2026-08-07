import { Router } from "express";
import { register, login, getProfile, recordConsent } from "./auth.controller.js";
import { authenticateToken, requireRole, validateBody } from "@/middleware/index.js";
import { UserRole } from "@prisma-client";
import { loginSchema, registerSchema, consentSchema } from "@/validators/schemas.js";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), register);
authRoutes.post("/login", validateBody(loginSchema), login);

// /consent + /profile are identity endpoints: STUDENT, COUNSELOR, SCHOOL_ADMIN
// and ADMIN all need them (counselor portal reads /profile; consent is
// self-recorded by the token holder — there is no on-behalf path today).
// authenticateToken alone is the correct guard here.
authRoutes.post("/consent", authenticateToken, validateBody(consentSchema), recordConsent);
authRoutes.get("/profile", authenticateToken, getProfile);

// P1-4: /role is a STUDENT-only utility. The role claim check lets a
// counselor/admin token confirm its own role without exposing student data.
authRoutes.get("/role", authenticateToken, requireRole(UserRole.STUDENT, UserRole.COUNSELOR, UserRole.SCHOOL_ADMIN, UserRole.ADMIN), (req, res) => {
  res.json({ role: req.student?.role });
});
