import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Loader2, ArrowRight, AlertCircle, GraduationCap, Brain, Target, ClipboardList, Users, HeartHandshake, BookOpen } from "lucide-react";
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label,
} from "@arcevo/facet-components";
import { LandingLayout } from "@arcevo/facet-layout";
import { Alert, AlertDescription } from "@/components/Alert";
import PasswordInput from "@/components/PasswordInput";
import BrandLogo from "@/components/BrandLogo";
import { STEP_TO_ROUTE, useResumeStep } from "@/hooks/useResumeStep";
import type { AssessmentStep } from "@/types";

/**
 * Landing page (`/`).
 *
 * An overview of what StreamWise is, with clear action buttons:
 *   • "Take the Assessment": routes to the informed-consent gate at
 *     /consent. Anonymous visitors agree first, then create an account
 *     (consent intent carried via sessionStorage into register). A logged-in
 *     student who hasn't consented is routed there too; an already-consented
 *     student goes straight into the assessment flow.
 *   • "Sign in to my results" for returning students (Login routes by role
 *     and by whether a recommendation exists).
 * An already-consented, logged-in student is sent straight into the
 * assessment flow instead of seeing this page.
 */

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Personalised stream match",
    text: "Science, Humanities, or Business, recommended from your real academic scores, not guesswork.",
  },
  {
    icon: Brain,
    title: "Two research-backed quizzes",
    text: "A 48-item vocational interest (RIASEC) quiz and a 20-item personality (BFI) questionnaire.",
  },
  {
    icon: Target,
    title: "JAMB subject check",
    text: "Validate your O'Level subjects against real university course requirements before you apply.",
  },
];

const STEPS = [
  { n: "01", title: "Create an account", text: "Sign up with your school details and give your informed consent." },
  { n: "02", title: "Enter your scores", text: "JSS3 average + SS1 subject scores across your stream's core subjects." },
  { n: "03", title: "Complete the quizzes", text: "Rate your interests (RIASEC) and personality (BFI). Takes about 10 minutes." },
  { n: "04", title: "Get your result", text: "A ranked recommendation with confidence level, guidance, and a JAMB validator." },
];

/** Why StreamWise exists: the problem in numbers. These are the same
 *  verifiable figures cited in the project's Chapter 2 literature review,
 *  kept together here so a visitor gets the full context behind the engine. */
const WHY_POINTS = [
  {
    icon: Users,
    stat: "76%",
    title: "of 1.8 million+ candidates scored below 200 in the 2024 UTME",
    text: "Subject choices made at age 14 or 15 decide which university courses students can apply for years later. A wrong combination disqualifies them, no matter how high they score.",
    source: "JAMB 2024 UTME results",
  },
  {
    icon: HeartHandshake,
    stat: "Less than 30%",
    title: "of Nigerian secondary students have access to a school counsellor",
    text: "Most stream decisions therefore rely on informal advice from parents, teachers, and peers, often shaped by prestige rather than demonstrated aptitude.",
    source: "Guidance & counselling research",
  },
  {
    icon: BookOpen,
    stat: "2025/26",
    title: "The NERDC reform adds trade and digital subjects",
    text: "The revised curriculum introduces a compulsory trade subject and Digital Technologies: two more decisions at age 14 or 15, with no Nigerian tool yet built to guide them.",
    source: "NERDC / Federal Ministry of Education",
  },
];

export default function ConsentLanding() {
  const { token, role, consentRequired, login, guestLogin, refreshIdentity } = useAuth();
  const navigate = useNavigate();
  // For a logged-in student: the furthest step they've completed. Used by the
  // "Continue assessment" CTA (never to hard-redirect away from the landing).
  const resumeRoute = useResumeStep(token != null && consentRequired === false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState("");

  const needsConsent = token && consentRequired === true;

  // On first load, refresh identity so we know whether this user has already
  // consented. The landing page is the stable hub for everyone: authenticated
  // users are NOT hard-redirected away (they may have nothing pending to do).
  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    void refreshIdentity().finally(() => setBootstrapping(false));
  }, [token, refreshIdentity]);

  /** The main "Take the Assessment" action. Routes by auth + consent state. */
  function handleStartAssessment(): void {
    if (role === "GUEST") {
      // A guest has no account to attach assessment data to: they must
      // register first. Route them to the account creation page.
      navigate("/register");
      return;
    }
    if (token) {
      // Authenticated. If consent is still pending, the /consent gate is
      // where they agree (it also blocks /scores server-verified). Otherwise
      // resume from the furthest completed step (or the results hub).
      navigate(needsConsent ? "/consent" : resumeRoute ?? "/scores");
    } else {
      // Anonymous visitor: consent gate first, then account creation.
      navigate("/consent");
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const res = await login(loginEmail, loginPassword);
      // Default landing for every role is the marketing home page. Staff
      // reach the console from the avatar dropdown; students resume only
      // when the assessment is incomplete.
      if (res.student.role !== "STUDENT") {
        navigate("/admin", { replace: true });
        return;
      }
      // Resume from the furthest step completed (GET /auth/progress). If a
      // recommendation already exists there is nothing pending: the landing
      // CTA offers history/results instead.
      const { data: progress } = await api.get<{ step: AssessmentStep }>("/auth/progress");
      if (progress.step === "results") {
        navigate("/", { replace: true });
        return;
      }
      navigate(STEP_TO_ROUTE[progress.step], { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setLoggingIn(false);
    }
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const footer = (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
      {/* Brand + one-liner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-8" />
          <span className="text-sm font-bold tracking-tight text-foreground">StreamWise</span>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          A weighted decision support system that helps Nigerian SS2 students choose an
          academic stream with research-backed confidence.
        </p>
      </div>

      {/* Product */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</h4>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li>
            <Link to="/scores" className="transition-colors hover:text-foreground">
              Take the Assessment
            </Link>
          </li>
          <li>
            <Link to="/consent" className="transition-colors hover:text-foreground">
              Informed Consent
            </Link>
          </li>
          <li>
            <Link to="/history" className="transition-colors hover:text-foreground">
              My Results
            </Link>
          </li>
        </ul>
      </div>

      {/* How it works */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">How it works</h4>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="font-semibold text-foreground">{s.n}</span> · {s.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Research notice */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Research</h4>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          StreamWise is a final-year academic project, not an official LASU, NERDC, or JAMB
          service. Its recommendation is a decision aid, not a replacement for a qualified
          guidance counsellor.
        </p>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} StreamWise. Final-year academic project.</p>
        <div className="flex items-center gap-4">
          <Link to="/consent" className="transition-colors hover:text-foreground">
            Consent
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );

  const hero = (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-5xl flex-col items-center justify-center px-4 text-center lg:min-h-[calc(100vh-20rem)]">
      <BrandLogo className="mx-auto h-24 w-24 shadow-md" />
      <h1 className="mt-6 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
        Find the academic stream that fits you
      </h1>
      <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        StreamWise recommends a Science, Humanities, or Business stream to Nigerian SS2
        students using a research-backed AHP-SAW decision engine: your academic scores,
        vocational interests, and personality, combined into one clear recommendation.
      </p>

      {/* Why it matters: a compact, scannable teaser. The full context lives
          in the "Why StreamWise?" section below the hero. */}
      <div className="mx-auto mt-10 grid w-full max-w-3xl grid-cols-3 gap-4">
        {WHY_POINTS.map((s) => (
          <Card key={s.title} variant="glass" className="h-full rounded-2xl border-border/60 text-left">
            <CardContent className="flex h-full flex-col pt-5">
              <s.icon size={18} className="text-primary" />
              <p className="mt-2 text-xl font-black tracking-tight tabular-nums text-foreground">
                {s.stat}
              </p>
              <p className="mt-0.5 text-xs font-medium leading-snug text-muted-foreground">
                {s.title}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={handleStartAssessment}>
          {needsConsent
            ? "Complete Consent & Start"
            : token && role !== "GUEST"
              ? resumeRoute === "/history"
                ? "View My Results"
                : "Continue Assessment"
              : "Take the Assessment"}
          <ArrowRight size={16} />
        </Button>
        {token && role !== "GUEST" ? (
          <Button variant="outline" size="lg" onClick={() => navigate("/history")}>
            My History
          </Button>
        ) : (
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Sign in to my results</Link>
          </Button>
        )}
      </div>

      {/* Guest reviewer access: browse the system without an account. */}
      {role !== "GUEST" && (
        <div className="mt-5">
          <button
            type="button"
            onClick={async () => {
              try {
                await guestLogin();
                navigate("/", { replace: true });
              } catch {
                setError("Could not start a guest session. Please try again.");
              }
            }}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Continue as guest reviewer → no account needed
          </button>
        </div>
      )}

      {role === "GUEST" && (
        <p className="mt-5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          You're browsing as a guest · create an account to start the assessment
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Free for SS2 students · Takes about 15 minutes · Retake as many times as you like
      </p>
    </div>
  );

  return (
    <LandingLayout footer={footer} hero={hero}>
      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} variant="glass" className="rounded-2xl border-border/60">
              <CardContent className="pt-6">
                <f.icon size={22} className="text-primary" />
                <h3 className="mt-3 font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h2 className="text-center text-xl font-black text-foreground">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card/60 p-4">
                <span className="text-2xl font-black text-primary/40">{s.n}</span>
                <h3 className="mt-1 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why StreamWise exists: the full problem in numbers */}
        <div className="mt-16">
          <h2 className="text-center text-xl font-black text-foreground">Why StreamWise?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
            Choosing a stream at age 14 or 15 fixes the subjects students will sit at WAEC/NECO and the
            courses they can apply for. The numbers below show how poorly that decision is currently
            supported.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHY_POINTS.map((s) => (
              <Card key={s.title} variant="glass" className="h-full rounded-2xl border-border/60 text-left">
                <CardContent className="flex h-full flex-col pt-6">
                  <s.icon size={20} className="text-primary" />
                  <p className="mt-3 text-2xl font-black tracking-tight tabular-nums text-foreground">
                    {s.stat}
                  </p>
                  <h3 className="mt-1 text-sm font-bold leading-snug text-foreground">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
                  <p className="mt-auto pt-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {s.source}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick login (anonymous visitors) */}
        {!token && (
          <div className="mx-auto mt-12 max-w-md">
            <Card variant="glass" className="rounded-2xl border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList size={16} className="text-primary" />
                  Returning student?
                </CardTitle>
                <CardDescription>Sign in to see your results and history</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="landing-email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="landing-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="landing-password" className="text-xs">
                      Password
                    </Label>
                    <PasswordInput
                      id="landing-password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={loggingIn} className="w-full">
                    {loggingIn ? <Loader2 size={14} className="animate-spin" /> : "Log in"}
                  </Button>
                </form>

                {error && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <Link to="/register" className="font-semibold text-primary hover:underline">
                    Create an account
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </LandingLayout>
  );
}
