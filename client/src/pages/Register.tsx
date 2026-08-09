import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/api/errors";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import type { Gender, ConsentPayload } from "@/types/index";
import { User, Mail, Calendar, School, ArrowRight, AlertCircle, Loader2, BarChart3, ShieldCheck } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@arcevo/facet-components";
import { Alert, AlertDescription } from "@/components/Alert";
import PasswordInput from "@/components/PasswordInput";

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: "" | Gender;
  schoolName: string;
  careerAspiration: string;
  dateOfBirth: string;
}

/** Non-sensitive fields persisted as a draft (passwords are never stored). */
type RegisterDraft = Omit<RegisterForm, "password" | "confirmPassword">;

const EMPTY_DRAFT: RegisterDraft = {
  fullName: "",
  email: "",
  gender: "",
  schoolName: "",
  careerAspiration: "",
  dateOfBirth: "",
};

export default function Register() {
  const { register, consent } = useAuth();
  const navigate = useNavigate();

  const [draft, setDraft, clearDraft] = useLocalDraft<RegisterDraft>("dss_draft_register", EMPTY_DRAFT);
  const [form, setForm] = useState<RegisterForm>({ ...draft, password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value } = e.target;
    if (name !== "password" && name !== "confirmPassword") {
      setDraft((prev) => ({ ...prev, [name]: value }));
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        gender: (form.gender as Gender) || undefined,
        schoolName: form.schoolName || undefined,
        careerAspiration: form.careerAspiration || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      });
      clearDraft(); // registered, drop the saved fields

      // Consent intent comes from the consent-first landing page. If the user
      // went straight to register (e.g. deep link), they are routed to /consent
      // after sign-up so the ethics gate is never bypassed.
      const pendingRaw = sessionStorage.getItem("dss_pending_consent");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw) as ConsentPayload;
          await consent(pending);
          sessionStorage.removeItem("dss_pending_consent");
          navigate("/scores");
          return;
        } catch {
          /* consent will be re-prompted at /consent */
        }
      }
      navigate("/consent");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-foreground">Create Your Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Start your subject combination assessment</p>
        </div>

        <Card variant="glass" className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Personal details</CardTitle>
            <CardDescription>All fields except school name are required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="fullName"
                    className="pl-9"
                    name="fullName"
                    placeholder="e.g. Amara Okonkwo"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="reg-email">Email Address</Label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="reg-email"
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

              {/* Password pair */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Min. 8 chars"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Gender + DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v: string) => handleChange({ target: { name: "gender", value: v } } as ChangeEvent<HTMLSelectElement>)}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="UNSPECIFIED">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                      id="dateOfBirth"
                      className="pl-9"
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      autoComplete="bday"
                    />
                  </div>
                </div>
              </div>

              {/* School Name */}
              <div>
                <Label htmlFor="schoolName">
                  School Name{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <School
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="schoolName"
                    className="pl-9"
                    name="schoolName"
                    placeholder="e.g. Government Secondary School, Lagos"
                    value={form.schoolName}
                    onChange={handleChange}
                    autoComplete="organization"
                  />
                </div>
              </div>

              {/* P0-4b: career aspiration. Feeds the JAMB validator */}
              <div>
                <Label htmlFor="careerAspiration">
                  Career Aspiration{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <BarChart3
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    id="careerAspiration"
                    className="pl-9"
                    name="careerAspiration"
                    placeholder="e.g. Medicine and Surgery, Law, Accounting"
                    value={form.careerAspiration}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Consent link-out. The ethics gate lives on the landing page */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You&apos;ll be asked to review and agree to the{" "}
                  <Link to="/" className="font-semibold text-primary hover:underline">
                    informed consent
                  </Link>{" "}
                  points before your assessment begins.
                </p>
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
                    Creating Account…
                  </>
                ) : (
                  <>
                    Create Account & Start
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
