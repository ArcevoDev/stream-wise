import { useEffect, useState } from "react";
import { api } from "@/api";
import type { AssessmentStep, ProgressResponse } from "@/types";

/** Route for each completed step: the next step to start, or the results hub. */
export const STEP_TO_ROUTE: Record<AssessmentStep, string> = {
  consent: "/consent",
  scores: "/scores",
  riasec: "/riasec",
  personality: "/personality",
  results: "/history",
};

/**
 * Resolve where a logged-in student should land based on how far they got
 * in the assessment (server-side truth from GET /auth/progress).
 *
 *   - null while loading (callers should keep showing a spinner)
 *   - "/consent" if consent hasn't been granted
 *   - the next incomplete step otherwise
 *   - "/history" if a recommendation already exists (mini-dashboard)
 *
 * Falls back to "/scores" if the progress call itself fails.
 */
export function useResumeStep(active: boolean): string | null {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api
      .get<ProgressResponse>("/auth/progress")
      .then(({ data }) => {
        if (!cancelled) setRoute(STEP_TO_ROUTE[data.step]);
      })
      .catch(() => {
        if (!cancelled) setRoute("/scores");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return route;
}
