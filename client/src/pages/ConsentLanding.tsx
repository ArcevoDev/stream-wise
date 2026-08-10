import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Loader2 } from "lucide-react";
import { LandingLayout } from "@arcevo/facet-layout";
import LandingHero from "@/components/landing/LandingHero";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingSections from "@/components/landing/LandingSections";
import LandingLoginCard from "@/components/landing/LandingLoginCard";
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

  async function handleLogin(e: SubmitEvent<HTMLFormElement>): Promise<void> {
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

  async function handleGuestLogin(): Promise<void> {
    try {
      await guestLogin();
      navigate("/", { replace: true });
    } catch {
      setError("Could not start a guest session. Please try again.");
    }
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LandingLayout
      footer={<LandingFooter />}
      hero={
        <LandingHero
          needsConsent={!!needsConsent}
          isAuthenticated={token != null}
          isGuest={role === "GUEST"}
          resumeRoute={resumeRoute}
          onStart={handleStartAssessment}
          onGuestLogin={handleGuestLogin}
          onViewHistory={() => navigate("/history")}
        />
      }
    >
      <LandingSections />
      {!token && (
        <LandingLoginCard
          email={loginEmail}
          password={loginPassword}
          loggingIn={loggingIn}
          error={error}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
        />
      )}
    </LandingLayout>
  );
}
