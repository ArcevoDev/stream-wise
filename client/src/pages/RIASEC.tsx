import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api";
import ProgressBar from "@/components/ProgressBar";
import { getApiErrorMessage } from "@/api/errors";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useAuth } from "@/context/AuthContext";
import type { RiasecLetter, RiasecQuestion } from "@/types/index";
import { Brain, ChevronRight, ChevronLeft, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button, Card, CardContent } from "@arcevo/facet-components";
import { Alert, AlertDescription } from "@/components/Alert";

interface LikertOption {
  value: number;
  label: string;
}

const LIKERT: LikertOption[] = [
  { value: 1, label: "Strongly Dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly Like" },
];

const TYPE_COLORS: Record<RiasecLetter, string> = {
  R: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  I: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  A: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  S: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  E: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  C: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

const TYPE_NAMES: Record<RiasecLetter, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const TYPES: RiasecLetter[] = ["R", "I", "A", "S", "E", "C"];

interface RiasecDraft {
  responses: Record<number, number>;
  page: number;
}

export default function RIASEC() {
  const navigate = useNavigate();
  const { student } = useAuth();

  const [questions, setQuestions] = useState<RiasecQuestion[]>([]);
  const [draft, setDraft, clearDraft] = useLocalDraft<RiasecDraft>(
    "dss_draft_riasec",
    { responses: {}, page: 0 },
    student?.id,
  );
  const { responses, page } = draft;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api
      .get<{ questions: RiasecQuestion[] }>("/riasec/questions")
      .then(({ data }) => {
        setQuestions(data.questions);
        setFetching(false);
      })
      .catch(() => {
        setError("Failed to load questions. Please refresh.");
        setFetching(false);
      });
  }, []);

  const currentType = TYPES[page]!;
  const pageQuestions = questions.filter((q) => q.type === currentType);
  const answered = pageQuestions.filter((q) => responses[q.id] !== undefined).length;
  const pageComplete = answered === pageQuestions.length && pageQuestions.length > 0;
  const totalAnswered = Object.keys(responses).length;
  const totalExpected = questions.length;

  function handleRate(questionId: number, value: number): void {
    setDraft((prev) => ({ ...prev, responses: { ...prev.responses, [questionId]: value } }));
    setError("");
  }

  function handleNext(): void {
    if (!pageComplete) {
      setError("Please answer all questions on this page before continuing.");
      return;
    }
    setError("");
    // Show a small progress toast only on the first 5 section advances
    if (page < 5) {
      toast.info(`Section ${page + 1} complete. ${TYPES.length - page - 1} sections left.`, {
        duration: 2000,
      });
    }
    setDraft((prev) => ({ ...prev, page: prev.page + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(): Promise<void> {
    if (!pageComplete) {
      setError("Please answer all questions before submitting.");
      return;
    }
    if (totalAnswered < totalExpected) {
      setError(`Some questions are unanswered (${totalAnswered}/${totalExpected}).`);
      return;
    }
    setLoading(true);
    try {
      const orderedResponses = [...questions]
        .sort((a, b) => a.id - b.id)
        .map((q) => {
          const v = responses[q.id];
          if (v === undefined) throw new Error(`Missing response for question ${q.id}`);
          return v;
        });

      await api.post("/riasec/submit", { responses: orderedResponses });
      clearDraft(); // submitted, drop the autosave draft so a refresh can't re-post it
      toast.success("Interest profile saved!", {
        description: "Your RIASEC summary code has been calculated.",
      });
      navigate("/personality", { state: { justSubmitted: true } });
    } catch (err) {
      const msg = getApiErrorMessage(err, "Submission failed. Please try again.");
      setError(msg);
      toast.error("Submission failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading assessment questions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <ProgressBar
          step={2}
          total={4}
          labels={["Scores", "Interests", "Personality", "Results"]}
          stepPct={totalExpected > 0 ? (totalAnswered / totalExpected) * 100 : 0}
        />

        {/* Section progress dots */}
        <div className="mt-6 flex gap-1.5 justify-center">
          {TYPES.map((t, i) => (
            <div
              key={t}
              title={TYPE_NAMES[t]}
              className={`h-2 flex-1 rounded-full transition-all ${
                i < page ? "bg-primary" : i === page ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-1">
          Section {page + 1} of 6 · {TYPE_NAMES[currentType]} ({answered}/{pageQuestions.length} answered)
        </p>

        <div className="mt-6">
          <Card variant="glass" className="rounded-2xl border-border/60">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  <Brain size={14} />
                </span>
                <div>
                  <h2 className="font-black text-foreground text-lg">Vocational Interest Assessment</h2>
                  <p className="text-xs text-muted-foreground">
                    Rate how much you enjoy each activity ({totalExpected} items · 6 sections)
                  </p>
                </div>
              </div>

              {/* Type header badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold mb-6 ${TYPE_COLORS[currentType]}`}
              >
                {TYPE_NAMES[currentType]} ({currentType})
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {pageQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border transition-all ${
                      responses[q.id] !== undefined
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card/60"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground mb-3">
                      <span className="text-muted-foreground text-xs mr-2">Q{q.id}.</span>
                      {q.text}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {LIKERT.map((l) => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => handleRate(q.id, l.value)}
                          className={`flex-1 min-w-[60px] py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                            responses[q.id] === l.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-accent/50"
                          }`}
                        >
                          {l.value}
                          <span className="block text-[10px] leading-tight mt-0.5 opacity-70">
                            {l.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex gap-3">
                {page > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, page: prev.page - 1 }));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </Button>
                )}
                {page < 5 ? (
                  <Button type="button" className="flex-1" onClick={handleNext}>
                    Next Section
                    <ChevronRight size={15} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        Submit & Continue
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {totalAnswered} of {totalExpected} questions answered
        </p>
      </div>
    </div>
  );
}