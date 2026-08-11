import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import type { ConsentPayload } from "@/types";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Checkbox, Alert, AlertDescription, Icon } from "@arcevo/facet-components";

/**
 * P0-4a consent gate. A student with no "granted" consent record is routed
 * here before the assessment flow. All four ethics points must be agreed to
 * before continuing; partial consent is recorded as "withdrawn" so the
 * student can come back and complete it later.
 */
const CONSENT_POINTS: { key: "consentPoint1" | "consentPoint2" | "consentPoint3" | "consentPoint4"; label: string }[] = [
  {
    key: "consentPoint1",
    label: "I understand this is an academic project (StreamWise DSS) and not an official government or school service.",
  },
  {
    key: "consentPoint2",
    label: "I agree that my responses may be used to generate my stream recommendation and for evaluation in the research study.",
  },
  {
    key: "consentPoint3",
    label: "I understand this is a decision aid only and does not replace advice from a qualified guidance counsellor.",
  },
  {
    key: "consentPoint4",
    label: "I understand participation is voluntary and I may stop at any time.",
  },
];

export default function Consent() {
  const { token, consent } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [alreadyGranted, setAlreadyGranted] = useState(false);
  // Consent checkboxes autosave so a refresh doesn't lose partial agreement.
  const [checked, setChecked, clearChecked] = useLocalDraft<ConsentPayload>(
    "dss_draft_consent",
    {
      consentPoint1: false,
      consentPoint2: false,
      consentPoint3: false,
      consentPoint4: false,
    },
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Anonymous visitors: skip the identity check and show the consent form.
    if (!token) {
      setChecking(false);
      return;
    }
    let active = true;
    api
      .get("/auth/profile")
      .then(({ data }) => {
        if (!active) return;
        if (data.student?.consentStatus === "granted") {
          setAlreadyGranted(true);
          navigate("/scores", { replace: true });
        }
      })
      .catch(() => {
        /* interceptor handles 401/403 */
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [token, navigate]);

  const allChecked = Object.values(checked).every(Boolean);

  async function handleSubmit(): Promise<void> {
    if (!allChecked) {
      setError("Please agree to all four consent points to continue.");
      return;
    }
    // Anonymous visitor: carry consent intent to register (account creation
    // records consent in one flow). Registered users record it directly.
    if (!token) {
      sessionStorage.setItem("dss_pending_consent", JSON.stringify(checked));
      navigate("/register");
      return;
    }
    setSaving(true);
    try {
      await consent(checked);
      clearChecked(); // recorded, drop the local consent draft
      navigate("/scores", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save your consent. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Icon name="loader-circle" size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alreadyGranted) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Icon name="shield-check" size={28} className="mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-black text-foreground">Informed Consent</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Before you begin the assessment, please read and agree to the following.
          </p>
        </div>

        <Card variant="glass" className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Research ethics & data use</CardTitle>
            <CardDescription>
              Your consent is required to proceed. You can stop at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CONSENT_POINTS.map((point, i) => (
                <label key={point.key} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    name={point.key}
                    checked={checked[point.key]}
                    onCheckedChange={(isChecked) => {
                      setChecked((prev) => ({ ...prev, [point.key]: isChecked === true }));
                      setError("");
                    }}
                    className="mt-0.5 shrink-0"
                    aria-label={point.label}
                  />
                  <span className="text-sm text-foreground leading-snug">
                    <span className="font-semibold mr-1 text-muted-foreground">{i + 1}.</span>
                    {point.label}
                  </span>
                </label>
              ))}

              {error && (
                <Alert variant="destructive">
                  <Icon name="circle-alert" size={14} className="shrink-0 mt-0.5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!allChecked || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Icon name="loader-circle" size={14} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    I Agree & Continue
                    <Icon name="arrow-right" size={15} />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
