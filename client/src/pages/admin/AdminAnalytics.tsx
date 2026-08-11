import { useEffect, useState } from "react";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Icon, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from "@arcevo/facet-components";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import type { Stream } from "@/types";

interface AnalyticsResponse {
  analytics: {
    streamDistribution: Record<Stream, number>;
    confidenceDistribution: { bin: string; count: number }[];
    registrationsByMonth: { month: string; count: number }[];
    topCourses: {
      courseId: string;
      courseName: string;
      facultyArea: string;
      validationCount: number;
      complianceRate: number;
    }[];
    avgAcademicPerStream: { stream: Stream | null; avgWeightedScore: number }[];
  };
}

const STREAM_COLORS: Record<Stream, string> = {
  Science: "#3B82F6",
  Humanities: "#8B5CF6",
  Business: "#10B981",
};

const STREAM_LABELS: Record<Stream, string> = {
  Science: "Science",
  Humanities: "Humanities",
  Business: "Business",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await api.get<AnalyticsResponse>("/admin/analytics");
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load analytics."));
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
        <Icon name="loader-circle" size={20} className="animate-spin mr-2" />
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "No analytics available."}</AlertDescription>
      </Alert>
    );
  }

  const { analytics } = data;

  const streamData = (Object.keys(analytics.streamDistribution) as Stream[]).map((stream) => ({
    name: STREAM_LABELS[stream],
    value: analytics.streamDistribution[stream] ?? 0,
    color: STREAM_COLORS[stream],
  }));

  const avgScoreData = analytics.avgAcademicPerStream
    .filter((r) => r.stream !== null)
    .map((r) => ({ name: STREAM_LABELS[r.stream as Stream], score: Math.round(r.avgWeightedScore) }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated recommendation, registration, and JAMB course insights
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stream distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Stream Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {streamData.every((d) => d.value === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No recommendations yet.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={streamData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {streamData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confidence histogram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.confidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Recommendations" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Registrations over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.registrationsByMonth}>
                  <defs>
                    <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Registrations"
                    stroke="#3B82F6"
                    fill="url(#regGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top JAMB courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top JAMB Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topCourses.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No JAMB validations yet.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topCourses.map((c) => ({
                      name: c.courseName,
                      validations: c.validationCount,
                      compliance: c.complianceRate,
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="validations" name="Validations" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg academic score per stream */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Average Weighted Academic Score by Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {avgScoreData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No academic profiles yet.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={avgScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="score" name="Avg weighted score" radius={[4, 4, 0, 0]}>
                      {avgScoreData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STREAM_COLORS[entry.name as Stream] ?? "#3B82F6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
