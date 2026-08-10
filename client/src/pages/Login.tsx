import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Alert, AlertDescription } from "@arcevo/facet-components";
import PasswordInput from "@/components/PasswordInput";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { STEP_TO_ROUTE } from "@/hooks/useResumeStep";
import type { AssessmentStep } from "@/types";

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Draft-persist ONLY the email (remember-me). The password is never written
  // to localStorage: session-only state.
  const [draftEmail, setDraftEmail, clearDraftEmail] = useLocalDraft<{ email: string }>(
    "dss_draft_login_email",
    { email: "" },
  );
  const [form, setForm] = useState<LoginForm>({ email: draftEmail.email, password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    if (name === "email") setDraftEmail({ email: value });
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      clearDraftEmail(); // logged in, drop the saved email
      // Default landing for every role is the marketing home page. The
      // assessment flow (or staff console) is one click away from there.
      if (res.student.role !== "STUDENT") {
        navigate("/", { replace: true });
        return;
      }
      // Students resume the assessment ONLY if it's incomplete. Once a
      // recommendation exists there is nothing pending: land on the marketing
      // hub, where the CTA offers history/results instead of the flow.
      const { data: progress } = await api.get<{ step: AssessmentStep }>("/auth/progress");
      if (progress.step === "results") {
        navigate("/", { replace: true });
        return;
      }
      navigate(STEP_TO_ROUTE[progress.step], { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">Log in to continue your assessment</p>
        </div>

        <Card variant="glass" className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sign in to your account</CardTitle>
            <CardDescription>Enter your email and password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="email"
                    className="pl-9"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Logging in…
                  </>
                ) : (
                  <>
                    Log In
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              New here?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create an account
              </Link>
            </p>

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Staff?</span> Counsellors and admins
                sign in here too, they land on the Staff Console. Demo accounts:{" "}
                <code className="font-mono text-[10px]">counselor@dss.test</code> /{" "}
                <code className="font-mono text-[10px]">schooladmin@dss.test</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
