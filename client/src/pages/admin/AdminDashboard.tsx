import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import {
  Users,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Loader2,
  ArrowRight,
  UserPlus,
  ClipboardList,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress, Alert, AlertDescription } from "@arcevo/facet-components";

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

const FUNNEL_STEPS: { key: keyof StatsResponse["stats"]["funnel"]; label: string; icon: typeof Users }[] = [
  { key: "registered", label: "Registered", icon: UserPlus },
  { key: "scores", label: "Scores Entered", icon: ClipboardList },
  { key: "riasec", label: "RIASEC Done", icon: Sparkles },
  { key: "bfi", label: "BFI Done", icon: CircleCheck },
  { key: "recommended", label: "Recommended", icon: GraduationCap },
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
        <Loader2 size={20} className="animate-spin mr-2" />
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
    { label: "Total Students", value: stats.totalStudents, icon: Users },
    { label: "Recommendations", value: stats.totalRecommendations, icon: GraduationCap },
    { label: "JAMB Validations", value: stats.totalJambValidations, icon: ShieldCheck },
    { label: "JAMB Courses", value: stats.totalCourses, icon: BookOpen },
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
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <kpi.icon size={18} />
                </span>
                <div>
                  <p className="text-2xl font-black text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
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
                    <step.icon size={14} className="text-muted-foreground" />
                    {step.label}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{count}</span> · {pct}%
                  </span>
                </div>
                <Progress value={pct} />
                {i < FUNNEL_STEPS.length - 1 && (
                  <ArrowRight size={12} className="mx-auto text-muted-foreground/40" />
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
                <ArrowRight size={14} />
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
                <ArrowRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
