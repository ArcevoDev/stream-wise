import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import {
  Card, CardContent, CardHeader, CardTitle, Progress, Alert, AlertDescription,
} from "@arcevo/facet-components";
import GeneratedIcon, { type IconName } from "../../icons.generated.tsx";

interface StatsResponse {
  stats: {
    totalStudents: number;
    totalRecommendations: number;
    totalJambValidations: number;
    totalCourses: number;
    funnel: {
      registered: number;
      scores: number;
      riasec: number;
      bfi: number;
      recommended: number;
    };
  };
}

const FUNNEL_STEPS: { key: keyof StatsResponse["stats"]["funnel"]; label: string; icon: IconName }[] = [
  { key: "registered", label: "Registered", icon: "user-plus" },
  { key: "scores", label: "Scores Entered", icon: "clipboard-list" },
  { key: "riasec", label: "RIASEC Done", icon: "sparkles" },
  { key: "bfi", label: "BFI Done", icon: "circle-check" },
  { key: "recommended", label: "Recommended", icon: "graduation-cap" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await api.get<StatsResponse>("/admin/stats");
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load dashboard stats."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <GeneratedIcon name="loader-circle" size={20} className="animate-spin mr-2" />
        Loading dashboard…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "No data available."}</AlertDescription>
      </Alert>
    );
  }

  const { stats } = data;
  const kpis = [
    { label: "Total Students", value: stats.totalStudents, icon: "users" },
    { label: "Recommendations", value: stats.totalRecommendations, icon: "graduation-cap" },
    { label: "JAMB Validations", value: stats.totalJambValidations, icon: "shield-check" },
    { label: "JAMB Courses", value: stats.totalCourses, icon: "book-open" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview and student completion funnel
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="min-w-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GeneratedIcon name={kpi.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black text-foreground tabular-nums">{kpi.value}</p>
                  <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {FUNNEL_STEPS.map((step, i) => {
            const count = stats.funnel[step.key];
            const pct =
              stats.funnel.registered > 0
                ? Math.round((count / stats.funnel.registered) * 100)
                : 0;
            return (
              <div key={step.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <GeneratedIcon name={step.icon} size={14} className="text-muted-foreground" />
                    {step.label}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{count}</span> · {pct}%
                  </span>
                </div>
                <Progress value={pct} />
                {i < FUNNEL_STEPS.length - 1 && (
                  <GeneratedIcon name="arrow-right" size={12} className="mx-auto text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Student Directory</p>
                <p className="text-xs text-muted-foreground">
                  Search, filter, and drill into any student record
                </p>
              </div>
              <Link
                to="/admin/students"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Browse
                <GeneratedIcon name="arrow-right" size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Stream distribution, confidence, registrations, course demand
                </p>
              </div>
              <Link
                to="/admin/analytics"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View charts
                <GeneratedIcon name="arrow-right" size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
