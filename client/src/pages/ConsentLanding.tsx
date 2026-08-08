import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/api/errors";
import type { ConsentPayload } from "@/types";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Label,
  Navbar,
} from "@arcevo/facet-components";
import { LandingLayout } from "@arcevo/facet-layout";
import { Alert, AlertDescription } from "@/components/Alert";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Consent-first landing page (CLAUDE.md spec).
 *
 * `/` is the project's informed-consent gate, NOT a marketing page and NOT
 * the register page. A user who has already consented once is only asked to
 * log in when they need to (consent is stored on their account). The four
 * ethics points are individual facet Checkboxes. The CTA stays inert until
 * every point is checked (no dark patterns, no pre-checked boxes).
 */
const CONSENT_POINTS: { key: "consentPoint1" | "consentPoint2" | "consentPoint3" | "consentPoint4"; label: string; detail: string }[] = [
  {
    key: "consentPoint1",
    label: "This is an academic research project, not an official service",
    detail: "StreamWise is a final-year university project. It is not an official LASU, NERDC, or JAMB product and it gives no official placement decision.",
  },
  {
    key: "consentPoint2",
    label: "My responses may be used to generate a recommendation and for the study",
    detail: "My academic scores, RIASEC responses, and personality answers will be used to compute my stream recommendation and may be analysed for this research project's evaluation.",
  },
  {
    key: "consentPoint3",
    label: "The recommendation is a decision aid, not a replacement for a counsellor",
    detail: "I understand StreamWise's recommendation supports, but never replaces, guidance from a qualified guidance counsellor and my parents or guardians.",
  },
  {
    key: "consentPoint4",
    label: "I am participating voluntarily and may stop at any time",
    detail: "I provide this information freely and understand I can stop or withdraw at any point, including deleting my account and data.",
  },
];

type ConsentKey = "consentPoint1" | "consentPoint2" | "consentPoint3" | "consentPoint4";

/** react-router adapter so the facet Navbar renders SPA links. */
function FacetLink({ href, children, className, onClick }: { href: string; className?: string; children?: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

const router = {
  Link: FacetLink,
  isActive: (href: string) => window.location.pathname.startsWith(href),
};

/** LASU brand mark. The source PNG is a shield on a solid black square canvas,
 * so it is framed in a circular badge (rounded-full + ring) rather than
 * clipped into a circle, which would crop the shield and leave black wedges
 * at the corners. The circle makes the mark read as an intentional emblem. */
function LasuLogo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border shadow-sm ${className ?? ""}`}
    >
      <img
        src="/lasu.png"
        alt="Lagos State University"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export default function ConsentLanding() {
  const { token, role, consentRequired, consent: consentCb, login, refreshIdentity } = useAuth();
  const navigate = useNavigate();

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [checked, setChecked] = useState<ConsentPayload>({
    consentPoint1: false,
    consentPoint2: false,
    consentPoint3: false,
    consentPoint4: false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const alreadyConsented = token && consentRequired === false;
  const allChecked = useMemo(() => Object.values(checked).every(Boolean), [checked]);

  // On first load, refresh identity so we know whether this user has already
  // consented. A returning, already-consented user is routed straight into
  // the assessment instead of being shown the consent card again.
  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    void refreshIdentity().finally(() => setBootstrapping(false));
  }, [token, refreshIdentity]);

  useEffect(() => {
    if (alreadyConsented) navigate("/scores", { replace: true });
  }, [alreadyConsented, navigate]);

  function togglePoint(key: ConsentKey, value: boolean): void {
    setChecked((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  async function handleConsentAndContinue(): Promise<void> {
    if (!allChecked) return;
    setSaving(true);
    setError("");
    try {
      if (token) {
        await consentCb(checked);
        navigate("/scores", { replace: true });
      } else {
        // Not signed in yet: capture consent intent on the landing page, then
        // send the user to register. Registration creates the account and
        // records consent in one flow (consent payload carried via sessionStorage).
        sessionStorage.setItem("dss_pending_consent", JSON.stringify(checked));
        navigate("/register");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save your consent. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const res = await login(loginEmail, loginPassword);
      // Staff roles skip the assessment flow entirely.
      if (res.student.role !== "STUDENT") {
        navigate("/admin", { replace: true });
        return;
      }
      // After login, /auth/profile tells us whether consent is still pending.
      const stillRequired = await refreshIdentity();
      navigate(stillRequired ? "/consent" : "/scores", { replace: true });
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

  if (alreadyConsented) return null;

  const nav = (
    <Navbar
      variant="pill"
      brand={
        <div className="flex items-center gap-3">
          <LasuLogo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-foreground">StreamWise</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Weighted Decision Support System
            </p>
          </div>
        </div>
      }
      links={[]}
      actions={
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {token ? (
            <Button asChild size="sm">
              <Link to={role === "STUDENT" ? "/scores" : "/admin"}>Continue →</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      }
      router={router}
      onNavigate={(href) => navigate(href)}
      showMobileMenu={false}
    />
  );

  const footer = (
    <p className="text-xs text-muted-foreground">
      DSS. Weighted Decision Support System for Nigerian SS2 Students · AHP-SAW Engine ·
      RIASEC · BFI-20 · 2025 NERDC aligned
    </p>
  );

  return (
    <LandingLayout
      nav={nav}
      footer={footer}
      hero={
        <div className="mx-auto w-full max-w-3xl px-4 pt-16 pb-6 text-center">
          <LasuLogo className="mx-auto h-24 w-24 shadow-md" />
          <h1 className="mt-6 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Find the right academic stream, with your consent
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            StreamWise recommends a Science, Humanities, or Business stream to Nigerian SS2
            students using a research-backed decision engine. Before we begin, please read and
            agree to each point below. Your consent is stored on your account, so you only need
            to do this once.
          </p>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-2xl px-4 pb-16">
        <Card variant="glass" className="rounded-2xl border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informed consent. Research ethics & data use</CardTitle>
            <CardDescription>
              Four points, all required. Nothing is pre-checked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {CONSENT_POINTS.map((point, i) => (
                <div key={point.key} className="flex items-start gap-3">
                  <Checkbox
                    id={`consent-${point.key}`}
                    checked={checked[point.key]}
                    onCheckedChange={(value) => togglePoint(point.key, value === true)}
                    aria-label={point.label}
                    className="mt-0.5"
                  />
                  <label htmlFor={`consent-${point.key}`} className="cursor-pointer">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                      {point.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{point.detail}</p>
                  </label>
                </div>
              ))}

              {!allChecked && (
                <p className="text-xs text-muted-foreground">
                  Check all {CONSENT_POINTS.length} boxes to continue.
                </p>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleConsentAndContinue}
                disabled={!allChecked || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    I Agree & Continue
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>

              {!token && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?
                  </p>
                  <form onSubmit={handleLogin} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
                      <Input
                        id="landing-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" variant="outline" disabled={loggingIn} className="w-full sm:w-auto">
                        {loggingIn ? <Loader2 size={14} className="animate-spin" /> : "Log in"}
                      </Button>
                    </div>
                  </form>
                  <p className="text-center text-sm text-muted-foreground">
                    New here?{" "}
                    <Link to="/register" className="font-semibold text-primary hover:underline">
                      Create an account
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </LandingLayout>
  );
}
