import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/api/errors";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@arcevo/facet-components";
import { Alert, AlertDescription } from "@/components/Alert";

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { login, refreshIdentity } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      // Route by role: staff go straight to the admin console; students
      // continue the consent + assessment flow.
      if (res.student.role !== "STUDENT") {
        navigate("/admin", { replace: true });
        return;
      }
      // Re-derive consent status from /auth/profile. A user who already completed
      // consent once goes straight to the assessment; one who has not is sent
      // to the consent gate first.
      const stillRequired = await refreshIdentity();
      navigate(stillRequired ? "/consent" : "/scores", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
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
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="password"
                    className="pl-9"
                    type="password"
                    name="password"
                    placeholder="Your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
