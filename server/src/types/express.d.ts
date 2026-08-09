// ============================================================================
// Augments Express's Request type with the `student` property attached by
// the auth middleware after verifying the JWT. Keeping this centralised
// means every controller gets typed `req.student` without re-declaring it.
// ============================================================================

import type { UserRole } from "@prisma-client";

export interface AuthTokenPayload {
  id: string;
  email: string;
  fullName: string;
  /** "GUEST" is a synthetic role minted by POST /auth/guest (no DB row).
   * requireRole(...) rejects it, so guests can never reach assessment or
   * admin data, only the marketing + auth surface. */
  role: UserRole | "GUEST";
}

declare global {
  namespace Express {
    interface Request {
      student?: AuthTokenPayload;
    }
  }
}

// Required so this file is treated as a module (and the `declare global`
// augmentation is picked up) rather than a script.
export {};
