import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api";
import ProgressBar from "@/components/ProgressBar";
import { getApiErrorMessage } from "@/api/errors";
import { ClipboardList, ArrowRight, AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Subject, AcademicLevel, AcademicStream } from "server/enums";

interface SubjectField {
  subject: Subject;
  label: string;
  hint: string;
  formKey: string;
}

// Compulsory NERDC core — every student, every stream.
const CORE_FIELDS: SubjectField[] = [
  { subject: Subject.ENGLISH_LANGUAGE, label: "SS1 English Language", hint: "Your SS1 English Language score (0–100)", formKey: "ss1English" },
  { subject: Subject.MATHEMATICS, label: "SS1 Mathematics", hint: "Your SS1 Mathematics score (0–100)", formKey: "ss1Mathematics" },
];

// Stream-specific SS1 subjects — matches the groupings documented directly
// on the AcademicStream enum in schema.prisma.
const STREAM_FIELDS: Record<AcademicStream, SubjectField[]> = {
  [AcademicStream.SCIENCE]: [
    { subject: Subject.BIOLOGY, label: "SS1 Biology", hint: "Your SS1 Biology score (0–100)", formKey: "ss1Biology" },
    { subject: Subject.CHEMISTRY, label: "SS1 Chemistry", hint: "Your SS1 Chemistry score (0–100)", formKey: "ss1Chemistry" },
    { subject: Subject.PHYSICS, label: "SS1 Physics", hint: "Your SS1 Physics score (0–100)", formKey: "ss1Physics" },
  ],
  [AcademicStream.HUMANITIES]: [
    { subject: Subject.LITERATURE_IN_ENGLISH, label: "SS1 Literature in English", hint: "Your SS1 Literature score (0–100)", formKey: "ss1Literature" },
    { subject: Subject.GOVERNMENT, label: "SS1 Government", hint: "Your SS1 Government score (0–100)", formKey: "ss1Government" },
    { subject: Subject.HISTORY, label: "SS1 History", hint: "Your SS1 History score (0–100)", formKey: "ss1History" },
  ],
  [AcademicStream.BUSINESS]: [
    { subject: Subject.ECONOMICS, label: "SS1 Economics", hint: "Your SS1 Economics score (0–100)", formKey: "ss1Economics" },
    { subject: Subject.COMMERCE, label: "SS1 Commerce", hint: "Your SS1 Commerce score (0–100)", formKey: "ss1Commerce" },
    { subject: Subject.FINANCIAL_ACCOUNTING, label: "SS1 Financial Accounting", hint: "Your SS1 Financial Accounting score (0–100)", formKey: "ss1FinancialAccounting" },
  ],
};

const STREAM_LABELS: Record<AcademicStream, string> = {
  [AcademicStream.SCIENCE]: "Science",
  [AcademicStream.HUMANITIES]: "Humanities (Arts)",
  [AcademicStream.BUSINESS]: "Business / Commercial",
};

type ScoresForm = Record<string, string> & { jss3Average: string };

const EMPTY_FORM: ScoresForm = {
  jss3Average: "",
  ...Object.fromEntries(CORE_FIELDS.map((f) => [f.formKey, ""])),
};

export default function Scores() {
  const navigate = useNavigate();
  const [currentStream, setCurrentStream] = useState<AcademicStream | "">("");
  const [scores, setScores] = useState<ScoresForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeFields: SubjectField[] = currentStream
    ? [...CORE_FIELDS, ...STREAM_FIELDS[currentStream]]
    : CORE_FIELDS;

  function handleStreamChange(e: ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value as AcademicStream | "";
    setCurrentStream(next);
    setScores((prev) => {
      const preserved: ScoresForm = { jss3Average: prev.jss3Average };
      for (const f of CORE_FIELDS) preserved[f.formKey] = prev[f.formKey] ?? "";
      if (next) for (const f of STREAM_FIELDS[next]) preserved[f.formKey] = "";
      return preserved;
    });
    setError("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    if (value !== "" && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) return;
    setScores((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!currentStream) {
      setError("Please select your current academic stream.");
      return;
    }
    const incomplete = scores.jss3Average === "" || activeFields.some((f) => scores[f.formKey] === "");
    if (incomplete) {
      setError("Please fill in all subject scores before continuing.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        currentStream,
        scores: activeFields.map((f) => ({
          subject: f.subject,
          level: AcademicLevel.SS1,
          score: parseFloat(scores[f.formKey]!),
        })),
        jss3OverallAverage: parseFloat(scores.jss3Average),
      };
      await api.post("/profile/scores", payload);
      toast.success("Academic scores saved!", {
        description: "Moving on to the Interest Assessment.",
      });
      navigate("/riasec");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to save scores. Please try again.");
      setError(msg);
      toast.error("Save failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  const weighted = (() => {
    const jss3 = parseFloat(scores.jss3Average) || 0;
    const ss1s = activeFields.map((f) => parseFloat(scores[f.formKey]) || 0);
    const ss1Avg = ss1s.length === 0 ? 0 : ss1s.reduce((a, b) => a + b, 0) / ss1s.length;
    return (jss3 * 0.4 + ss1Avg * 0.6).toFixed(1);
  })();

  const filledCount = (scores.jss3Average !== "" ? 1 : 0) + activeFields.filter((f) => scores[f.formKey] !== "").length;
  const totalFields = activeFields.length + 1;
  const weightedNum = parseFloat(weighted);
  const previewColor =
    weightedNum >= 70 ? "text-emerald-600" : weightedNum >= 50 ? "text-amber-500" : "text-brand-600";

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <ProgressBar step={1} total={4} labels={["Scores", "Interests", "Personality", "Results"]} />

        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="step-badge">
                  <ClipboardList size={14} />
                </span>
                <div>
                  <h2 className="font-black text-gray-900 text-lg">Academic Score Entry</h2>
                  <p className="text-xs text-gray-500">
                    Enter your most recent JSS3 average and SS1 subject scores
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="currentStream">Current SS1 Stream</Label>
                  <select
                    id="currentStream"
                    name="currentStream"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={currentStream}
                    onChange={handleStreamChange}
                    required
                  >
                    <option value="" disabled>
                      Select your current stream…
                    </option>
                    {(Object.values(AcademicStream) as AcademicStream[]).map((s) => (
                      <option key={s} value={s}>
                        {STREAM_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    The stream you're currently placed in — this determines which SS1 subjects we ask for below.
                  </p>
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">
                  Junior Secondary (JSS3)
                </p>

                <div>
                  <Label htmlFor="jss3Average">JSS3 Overall Average</Label>
                  <Input
                    id="jss3Average"
                    type="number"
                    name="jss3Average"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0 – 100"
                    value={scores.jss3Average}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Your final JSS3 cumulative average across all subjects (0–100)
                  </p>
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">
                  Senior Secondary Year 1 (SS1)
                </p>

                {!currentStream && (
                  <p className="text-xs text-gray-400 italic">Select your stream above to see your subjects.</p>
                )}

                {activeFields.map((f) => (
                  <div key={f.formKey}>
                    <Label htmlFor={f.formKey}>{f.label}</Label>
                    <Input
                      id={f.formKey}
                      type="number"
                      name={f.formKey}
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="0 – 100"
                      value={scores[f.formKey] ?? ""}
                      onChange={handleChange}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
                  </div>
                ))}

                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mt-2 flex items-center gap-3">
                  <BarChart3 size={28} className="text-brand-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Weighted Academic Score Preview</p>
                    <p className={`text-2xl font-black ${previewColor}`}>
                      {weighted}
                      <span className="text-sm font-normal text-gray-400"> / 100</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      SS1 Average (60%) + JSS3 Average (40%) · {filledCount} of {totalFields} filled
                    </p>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Save & Continue to Interest Quiz
                      <ArrowRight size={15} />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}