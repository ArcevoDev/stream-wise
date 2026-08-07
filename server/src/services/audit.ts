// ============================================================================
// AUDIT SERVICE (P1-2)
// ============================================================================
// Writes AuditLog rows for key domain events. AuditLog is append-only by
// design (no update path anywhere in the codebase); this helper is the only
// place that creates rows, keeping the action vocabulary and metadata shape
// consistent across modules.
//
// Actions used:
//   LOGIN | SCORES_SUBMITTED | RIASEC_COMPLETED | BFI_COMPLETED
//   RECOMMENDATION_GENERATED | JAMB_VALIDATED
// ============================================================================

import type { Request } from "express";
import { prisma } from "@/db/prisma.js";

export interface AuditWriteInput {
  action: string;
  studentId: string;
  metadata?: Record<string, unknown>;
  /** Override the actor captured from the token (e.g. admin acting on a student). */
  actorId?: string;
  actorRole?: string;
}

/**
 * Fire-and-forget audit write. Never throws into the request path. An audit
 * failure must not break the business operation it is logging. Callers await
 * it when they want the log to land before responding (login, submits) or
 * fire it without await for best-effort logging.
 */
export async function writeAudit(req: Request, input: AuditWriteInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        studentId: input.studentId,
        actorId: input.actorId ?? req.student?.id ?? null,
        actorRole: input.actorRole ? (input.actorRole as never) : (req.student?.role ?? null),
        action: input.action,
        metadata: (input.metadata ?? {}) as never,
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write AuditLog row:", err);
  }
}
