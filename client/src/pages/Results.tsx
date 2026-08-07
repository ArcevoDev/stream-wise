import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/api";
import StreamCard from "@/components/StreamCard";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import GuidanceInsights from "@/components/GuidanceInsights";
import { getApiErrorMessage } from "@/api/errors";
import type { JambCourse, JambValidationResult, RecommendationResult, Stream } from "@/types/index";
import {
  Trophy, AlertTriangle, CheckCircle2, XCircle, Printer, RotateCcw,
  Loader2, Scale, ClipboardCheck, BarChart3, Info,
} from "lucide-react";
import { Button, Card, CardContent } from "@arcevo/facet-components";
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

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [jambResult, setJambResult] = useState<JambValidationResult | null>(null);
  const [jambLoading, setJambLoading] = useState(false);
  const [catalog, setCatalog] = useState<JambCourse[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [rec, cat] = await Promise.all([
          api.post<{ recommendation: RecommendationResult }>("/recommend"),
          api.get<{ courses: JambCourse[] }>("/jamb/catalog"),
        ]);
        setResult(rec.data.recommendation);
        setCatalog(cat.data.courses);
        toast.success(
          `Recommendation ready. ${rec.data.recommendation.topStream} Stream`,
          { description: `Confidence: ${rec.data.recommendation.confidenceLevel.toFixed(1)}%` }
        );
      } catch (err) {
        const msg = getApiErrorMessage(err, "Failed to load results. Please complete all steps first.");
        setError(msg);
        toast.error("Could not load results", { description: msg });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
          <Loader2 size={40} className="text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Running AHP-SAW engine…</p>
          <p className="text-gray-400 text-xs mt-1">Computing your personalised recommendation</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
            <h2 className="font-bold text-gray-900 mb-2">Could not generate results</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
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
    <div className="min-h-[calc(100vh-60px)] bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest">
            <Trophy size={12} />
            Step 4 · Your Results
          </span>
          <h1 className="text-3xl font-black text-gray-900">
            Your Recommended Stream:{" "}
            <span className="text-brand-500">{result.topStream}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Based on your academic performance, RIASEC profile, and personality indicators
          </p>
        </div>

        {/* Personality-source notice (P0-3b: renormalized, never fake data) */}
        {result.personalitySource === "renormalized" && (
          <Alert variant="warning">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                This recommendation was computed without a Personality assessment. The
                personality weight was redistributed over your real academic and RIASEC
                data.{" "}
                <button
                  onClick={() => navigate("/personality")}
                  className="font-semibold underline"
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
              <BarChart3 size={16} className="text-brand-500" />
              <h3 className="font-bold text-gray-900">SAW Preference Scores</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
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
          <h3 className="font-bold text-gray-900">Stream Rankings</h3>
          {result.ranked.map((r, i) => (
            <StreamCard key={r.stream} stream={r.stream} score={r.score} rank={i + 1} maxScore={maxScore} />
          ))}
        </div>

        {/* Guidance Insights */}
        <GuidanceInsights text={result.guidanceInsight} />

        {/* AHP Weights */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={14} className="text-brand-500" />
              <h3 className="font-bold text-gray-900 text-sm">AHP Decision Weights Used</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {result.ahpWeights?.labels?.map((label, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-lg font-black text-brand-500">
                    {((result.ahpWeights.weights[i] ?? 0) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              CR = {result.ahpWeights?.cr} (≤ 0.10 ✔ Consistent)
            </p>
          </CardContent>
        </Card>

        {/* JAMB Validator */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck size={18} className="text-brand-500" />
              <h3 className="font-bold text-gray-900">JAMB Subject Combination Validator</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Check if your recommended subjects satisfy JAMB O&apos;Level requirements for a
              specific university course.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Your validated subjects (from your SS1 academic record):
              </p>
              <p className="text-xs text-gray-700">
                {jambResult?.studentSubjects?.length
                  ? jambResult.studentSubjects.map((s) => subjectLabel(String(s))).join(" · ")
                  : "Select a course and validate to see your subject combination."}
              </p>
            </div>

            <div className="flex gap-2">
              <select
                aria-label="Select a target university course"
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setJambResult(null);
                }}
                className="flex h-10 flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a target university course…</option>
                {recommendedCourses.length > 0 && (
                  <optgroup label={`── ${result.topStream} Stream ──`}>
                    {recommendedCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.courseName}</option>
                    ))}
                  </optgroup>
                )}
                {otherCourses.length > 0 && (
                  <optgroup label="── Other Streams ──">
                    {otherCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courseName} ({c.streamCategory})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
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
                  jambResult.compliant ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                }`}
              >
                <p className={`font-bold text-sm flex items-center gap-2 ${
                  jambResult.compliant ? "text-emerald-700" : "text-red-700"
                }`}>
                  {jambResult.compliant
                    ? <><CheckCircle2 size={15} /> All prerequisites satisfied</>
                    : <><XCircle size={15} /> Missing required subjects</>
                  }
                </p>
                <p className="text-xs text-gray-600 mt-1">{jambResult.message}</p>
                {!jambResult.compliant && (jambResult.missingSubjects?.length ?? 0) > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-red-600">Missing:</p>
                    <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                      {jambResult.missingSubjects!.map((s) => (
                        <li key={s}>{subjectLabel(String(s))}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {jambResult.mandatorySubjects && (
                  <p className="text-xs text-gray-400 mt-2">
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
        <div className="flex gap-3 pb-8 no-print">
          <Button variant="secondary" className="flex-1" onClick={() => navigate("/scores")}>
            <RotateCcw size={14} />
            Retake Assessment
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