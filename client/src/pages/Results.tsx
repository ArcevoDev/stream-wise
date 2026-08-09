import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/api";
import StreamCard from "@/components/StreamCard";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import GuidanceInsights from "@/components/GuidanceInsights";
import { getApiErrorMessage } from "@/api/errors";
import type { JambCourse, JambValidationResult, RecommendationDetailResponse, RecommendationResult, Stream } from "@/types/index";
import {
  Trophy, AlertTriangle, CheckCircle2, XCircle, Printer, RotateCcw,
  Loader2, Scale, ClipboardCheck, BarChart3, Info, History,
} from "lucide-react";
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@arcevo/facet-components";
import { Alert, AlertDescription } from "@/components/Alert";

const STREAM_COLORS: Record<Stream, string> = {
  Science: "#3B82F6",
  Humanities: "#8B5CF6",
  Business: "#10B981",
};

function subjectLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Results() {
  const navigate = useNavigate();
  // Optional route param: /results/:id is a specific past recommendation
  // ("View details" from History). Without it, this is the live results page
  // which generates (or reuses) the latest recommendation.
  const { id: resultId } = useParams<{ id: string }>();
  // Arriving straight from a submit (Scores/RIASEC/Personality) already showed
  // a "saved!" toast : suppress this page's own "Recommendation ready" toast
  // so one action never stacks two toasts. A re-visit (history "View details",
  // avatar menu) still toasts.
  const justSubmitted = (useLocation().state as { justSubmitted?: boolean } | null)?.justSubmitted ?? false;

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [jambResult, setJambResult] = useState<JambValidationResult | null>(null);
  const [jambLoading, setJambLoading] = useState(false);
  const [catalog, setCatalog] = useState<JambCourse[]>([]);
  // StrictMode double-invokes the mount effect in dev. The server is now
  // idempotent (POST /recommend reuses the latest identical log), so the
  // duplicate call creates no duplicate history rows. This flag keeps the
  // "Recommendation ready" toast to one per app session.
  const toastedRef = useRef(false);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        // Viewing a specific past recommendation (from History): fetch it by
        // ID, no generation side effect.
        if (resultId) {
          const [{ data: detail }, cat] = await Promise.all([
            api.get<RecommendationDetailResponse>(`/recommend/history/${resultId}`),
            api.get<{ courses: JambCourse[] }>("/jamb/catalog"),
          ]);
          setResult(detail.recommendation);
          setCatalog(cat.data.courses);
          return;
        }
        const [rec, cat] = await Promise.all([
          api.post<{ generated: boolean; recommendation: RecommendationResult }>("/recommend"),
          api.get<{ courses: JambCourse[] }>("/jamb/catalog"),
        ]);
        setResult(rec.data.recommendation);
        setCatalog(cat.data.courses);
        // Toast only when a brand-new recommendation was generated (not when
        // an existing one was reused on re-visit), and not right after a
        // submit (the submit page already confirmed success).
        if (rec.data.generated && !justSubmitted && !toastedRef.current) {
          toastedRef.current = true;
          toast.success(
            `Recommendation ready. ${rec.data.recommendation.topStream} Stream`,
            { description: `Confidence: ${rec.data.recommendation.confidenceLevel.toFixed(1)}%` }
          );
        }
      } catch (err) {
        const msg = getApiErrorMessage(err, "Failed to load results. Please complete all steps first.");
        setError(msg);
        if (!justSubmitted && !toastedRef.current) {
          toastedRef.current = true;
          toast.error("Could not load results", { description: msg });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [justSubmitted, resultId]);

  async function handleJAMBValidate(): Promise<void> {
    if (!selectedCourseId || !result) return;
    setJambLoading(true);
    setJambResult(null);
    try {
      // P1-3: no hardcoded STREAM_SUBJECTS templates. The server validates
      // against the student's real SS1 SubjectScore rows.
      const { data } = await api.post<JambValidationResult>("/jamb/validate", {
        jambCourseId: selectedCourseId,
      });
      setJambResult(data);
      // Toast based on compliance result
      if ("compliant" in data) {
        if (data.compliant) {
          toast.success("JAMB prerequisites satisfied!", {
            description: `Your subjects meet all requirements for ${data.course}.`,
          });
        } else {
          toast.warning("Missing JAMB subjects", {
            description: `${data.missingSubjects?.length ?? 0} required subject(s) not in your combination.`,
          });
        }
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, "Validation failed.");
      setJambResult({ error: msg });
      toast.error("Validation failed", { description: msg });
    } finally {
      setJambLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Running AHP-SAW engine…</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Computing your personalised recommendation</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle size={40} className="text-warning mx-auto mb-4" />
            <h2 className="font-bold text-foreground mb-2">Could not generate results</h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/scores")}>
              <RotateCcw size={14} />
              Start From Step 1
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = [
    { name: "Science", score: parseFloat((result.vScience * 100).toFixed(2)) },
    { name: "Humanities", score: parseFloat((result.vHumanities * 100).toFixed(2)) },
    { name: "Business", score: parseFloat((result.vBusiness * 100).toFixed(2)) },
  ];

  const maxScore = Math.max(result.vScience, result.vHumanities, result.vBusiness);

  const recommendedCourses = catalog.filter(
    (c) => c.streamCategory === result.topStream.toUpperCase()
  );
  const otherCourses = catalog.filter(
    (c) => c.streamCategory !== result.topStream.toUpperCase()
  );

  return (
    <div className="min-h-[calc(100vh-60px)] bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest">
            <Trophy size={12} />
            Step 4 · Your Results
          </span>
          <h1 className="text-3xl font-black text-foreground">
            Your Recommended Stream:{" "}
            <span className="text-primary">{result.topStream}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Based on your academic performance, RIASEC profile, and personality indicators
          </p>
        </div>

        {/* Personality-source notice (P0-3b: renormalized, never fake data) */}
        {result.personalitySource === "renormalized" && (
          <Alert variant="warning">
            <Info size={16} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground">
                This recommendation was computed without a Personality assessment. The
                personality weight was redistributed over your real academic and RIASEC
                data.{" "}
                <button
                  onClick={() => navigate("/personality")}
                  className="font-semibold text-primary underline"
                >
                  Take the personality quiz
                </button>{" "}
                for a more complete result.
              </p>
            </div>
          </Alert>
        )}

        {/* Confidence Gauge */}
        <ConfidenceGauge value={result.confidenceLevel} />

        {/* SAW Score Chart */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-primary" />
              <h3 className="font-bold text-foreground">SAW Preference Scores</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Weighted scores × 100. Higher is a stronger match
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fontWeight: 600 }}
                  width={90}
                />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}`, "SAW Score ×100"]} />
                <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={STREAM_COLORS[entry.name as Stream]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stream Cards */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground">Stream Rankings</h3>
          {result.ranked.map((r, i) => (
            <StreamCard key={r.stream} stream={r.stream} score={r.score} rank={i + 1} maxScore={maxScore} />
          ))}
        </div>

        {/* Guidance Insights */}
        <GuidanceInsights text={result.guidanceInsight} />

        {/* AHP Weights */}
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={14} className="text-primary" />
              <h3 className="font-bold text-foreground text-sm">AHP Decision Weights Used</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {result.ahpWeights?.labels?.map((label, i) => (
                <div key={i} className="bg-background rounded-xl p-3 border border-border">
                  <p className="text-lg font-black text-primary">
                    {((result.ahpWeights.weights[i] ?? 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              CR = {result.ahpWeights?.cr} (≤ 0.10 ✔ Consistent)
            </p>
          </CardContent>
        </Card>

        {/* JAMB Validator */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">JAMB Subject Combination Validator</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Check if your recommended subjects satisfy JAMB O&apos;Level requirements for a
              specific university course.
            </p>

            <div className="bg-muted/40 rounded-lg p-3 mb-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Your validated subjects (from your SS1 academic record):
              </p>
              <p className="text-xs text-foreground">
                {jambResult?.studentSubjects?.length
                  ? jambResult.studentSubjects.map((s) => subjectLabel(String(s))).join(" · ")
                  : "Select a course and validate to see your subject combination."}
              </p>
            </div>

            <div className="flex gap-2">
              <Select
                value={selectedCourseId}
                onValueChange={(v) => {
                  setSelectedCourseId(v);
                  setJambResult(null);
                }}
              >
                <SelectTrigger aria-label="Select a target university course" className="flex-1">
                  <SelectValue placeholder="Select a target university course…" />
                </SelectTrigger>
                <SelectContent>
                  {recommendedCourses.length > 0 && (
                    <>
                      <SelectItem value="" disabled>
                        {result.topStream} Stream
                      </SelectItem>
                      {recommendedCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.courseName}</SelectItem>
                      ))}
                    </>
                  )}
                  {otherCourses.length > 0 && (
                    <>
                      <SelectItem value="" disabled>
                        Other Streams
                      </SelectItem>
                      {otherCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.courseName} ({c.streamCategory})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleJAMBValidate}
                disabled={!selectedCourseId || jambLoading}
                className="whitespace-nowrap"
              >
                {jambLoading ? (
                  <><Loader2 size={13} className="animate-spin" />Checking…</>
                ) : (
                  "Validate"
                )}
              </Button>
            </div>

            {jambResult && !("error" in jambResult && jambResult.error) && (
              <div
                className={`mt-4 p-4 rounded-xl border ${
                  jambResult.compliant
                    ? "bg-success/10 border-success/40"
                    : "bg-destructive/10 border-destructive/40"
                }`}
              >
                <p className={`font-bold text-sm flex items-center gap-2 ${
                  jambResult.compliant ? "text-success" : "text-destructive"
                }`}>
                  {jambResult.compliant
                    ? <><CheckCircle2 size={15} /> All prerequisites satisfied</>
                    : <><XCircle size={15} /> Missing required subjects</>
                  }
                </p>
                <p className="text-xs text-foreground mt-1">{jambResult.message}</p>
                {!jambResult.compliant && (jambResult.missingSubjects?.length ?? 0) > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-destructive">Missing:</p>
                    <ul className="list-disc list-inside text-xs text-destructive mt-1">
                      {jambResult.missingSubjects!.map((s) => (
                        <li key={s}>{subjectLabel(String(s))}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {jambResult.mandatorySubjects && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Mandatory for {jambResult.course}:{" "}
                    {jambResult.mandatorySubjects.map((s) => subjectLabel(String(s))).join(" · ")}
                  </p>
                )}
              </div>
            )}

            {"error" in (jambResult ?? {}) && (jambResult as { error?: string })?.error && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <AlertDescription>{(jambResult as { error: string }).error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-8 no-print sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={() => navigate("/scores")}>
            <RotateCcw size={14} />
            Retake Assessment
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate("/history")}>
            <History size={14} />
            View History
          </Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer size={14} />
            Print / Save Results
          </Button>
        </div>
      </div>
    </div>
  );
}