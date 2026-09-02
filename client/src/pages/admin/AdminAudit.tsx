import { useEffect, useState } from "react";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import {
  DataTable,
  type DataTableColumn,
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@arcevo/facet-components";
import GeneratedIcon from "../../icons.generated.tsx";
import type { AuditLogRow } from "@/types";

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  LOGIN: { label: "Login", variant: "default" },
  SCORES_SUBMITTED: { label: "Scores submitted", variant: "secondary" },
  RIASEC_COMPLETED: { label: "RIASEC completed", variant: "warning" },
  BFI_COMPLETED: { label: "BFI completed", variant: "warning" },
  RECOMMENDATION_GENERATED: { label: "Recommendation generated", variant: "success" },
  JAMB_VALIDATED: { label: "JAMB validated", variant: "success" },
};

const COLUMNS: DataTableColumn<AuditLogRow>[] = [
  {
    key: "createdAt",
    header: "When",
    accessor: (log) => new Date(log.createdAt).toLocaleString(),
  },
  {
    key: "action",
    header: "Event",
    accessor: (log) => ACTION_LABELS[log.action]?.label ?? log.action,
    cell: (log) => {
      const action = ACTION_LABELS[log.action] ?? { label: log.action, variant: "secondary" as const };
      return <Badge variant={action.variant}>{action.label}</Badge>;
    },
  },
  {
    key: "actor",
    header: "Actor",
    accessor: (log) => log.actor?.fullName ?? "Unknown actor",
    cell: (log) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {log.actor?.fullName ?? "Unknown actor"}
          {log.actor?.role && (
            <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground">
              {log.actor.role.replaceAll("_", " ")}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {log.actor?.email ?? log.student?.email ?? "system"}
        </p>
      </div>
    ),
  },
  {
    key: "student",
    header: "Target",
    accessor: (log) => (log.student && log.student.id !== log.actorId ? log.student.fullName : "—"),
    cell: (log) =>
      log.student && log.student.id !== log.actorId ? (
        <span className="text-sm text-foreground">{log.student.fullName}</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    key: "details",
    header: "Details",
    accessor: (log) => log.details ?? "—",
    cell: (log) =>
      log.details ? (
        <span className="text-sm text-muted-foreground">{log.details}</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
    sortable: false,
  },
];

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ logs: AuditLogRow[] }>("/admin/audit", {
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
            <GeneratedIcon name="shield-check" size={14} />
            Recent events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <GeneratedIcon name="loader-circle" size={20} className="animate-spin mr-2" />
              Loading audit trail…
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<GeneratedIcon name="shield-check" size={28} />}
              title="No audit records yet"
              description="Audit logging is wired up for the next milestone. System events will appear here as students interact with the platform."
            />
          ) : (
            <DataTable
              columns={COLUMNS}
              data={logs}
              searchable
              searchPlaceholder="Search events, actors, students…"
              exportable
              exportFileName="audit-trail"
              pagination
              pageSize={15}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
