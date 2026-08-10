import { useEffect, useState } from "react";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Alert, AlertDescription } from "@arcevo/facet-components";
import type { AuditLogRow } from "@/types";

interface AuditEntry {
  id: string;
  studentId: string | null;
  actorId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  actor: AuditLogRow["actor"];
  student: AuditLogRow["student"];
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  LOGIN: { label: "Login", variant: "default" },
  SCORES_SUBMITTED: { label: "Scores submitted", variant: "secondary" },
  RIASEC_COMPLETED: { label: "RIASEC completed", variant: "warning" },
  BFI_COMPLETED: { label: "BFI completed", variant: "warning" },
  RECOMMENDATION_GENERATED: { label: "Recommendation generated", variant: "success" },
  JAMB_VALIDATED: { label: "JAMB validated", variant: "success" },
};

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ logs: AuditEntry[] }>("/admin/audit", {
          params: { limit: 100 },
        });
        if (!cancelled) setLogs(data.logs);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load audit trail."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          System events across all students
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck size={14} />
            Recent events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading audit trail…
            </div>
          ) : logs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No audit records yet. Audit logging is wired up for the next milestone.
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const action = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  variant: "secondary" as const,
                };
                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={action.variant}>{action.label}</Badge>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {log.actor?.fullName ?? "Unknown actor"}
                          {log.actor?.role && (
                            <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground">
                              {log.actor.role.replaceAll("_", " ")}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {log.actor?.email ?? log.student?.email ?? "system"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.student && log.student.id !== log.actorId && (
                        <p className="text-[11px] text-muted-foreground">
                          on <span className="font-medium text-foreground">{log.student.fullName}</span>
                        </p>
                      )}
                      {log.details && (
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
