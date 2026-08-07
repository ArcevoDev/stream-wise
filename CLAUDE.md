# StreamWise Rebuild — Claude Code Prompt

> **IMPORTANT — this file is the ORIGINAL rebuild spec (aspirational), NOT a
> description of the current codebase.** The actual implementation diverged
> from this spec in two material ways. Read AGENTS.md (the current-state
> contract) first; where this spec conflicts with the code, this spec is the
> "North Star" vision and the code is the shipped reality:
>
> 1. **Framework**: spec says Next.js (App Router); the shipped app is
>    **React 19 + Vite 5 + React Router 6**. Do not "migrate to Next.js" —
>    the Vite SPA is the deployment target (Vercel static client + Express API).
> 2. **Identity**: spec says arc-id (`facet-auth` + `facet-sdk`) is the auth
>    layer and there is **no local role/AuditLog**. The shipped app keeps its
>    **own JWT auth** (`server/src/modules/auth/`, `Student.role` +
>    `requireRole`, local `AuditLog` table). arc-id is DEFERRED until it is
>    production-ready; the schema carries `Student.arcId` as the migration
>    surface. See AGENTS.md → "Auth / identity decision (2026-08-06)".
>
> The rest of this spec (facet-* UI foundation, pure AHP-SAW engine, landing/
> consent page) describes the direction accurately and is largely shipped.
> Use it for the landing-page consent spec and long-term vision; trust
> AGENTS.md + `.agent/output.txt` for the current state.

Paste this whole file as your prompt to Claude Code in a fresh repo.

---

## Context

Rebuild **StreamWise**, a Weighted Decision Support System (AHP-SAW) that
recommends Nigerian Senior Secondary School students a subject stream
(Science / Humanities / Business), a trade subject (2025/2026 NERDC reform),
and validates the result against JAMB O'Level prerequisites. Full academic
grounding is in `StreamWise_Chapters1-2_Rewrite.docx` (attach it) — read it
before designing the AHP-SAW engine and the data model.

This is being rebuilt as a member of the **ArcevoCirqle ecosystem**, on top
of these already-published packages (do not reimplement any of this):

- `@arcevo/facet-tokens` — design tokens (Alpha Palette, OKLCH, dark-first)
- `@arcevo/facet-components` — Radix-based component library (Button,
  Checkbox, Card, Dialog, Sheet, Command, etc. — 45+ components)
- `@arcevo/facet-layout` — app shell (`LandingLayout`, `AuthLayout`,
  `ConsoleLayout`, `Sidebar`, `Topbar`, `PageHeader`, `TenantSwitcher`) with
  a pre-built `eduLayoutPreset`
- `@arcevo/facet-auth` — `ArcProvider`, `SignIn`, `SignUp`, `Guard`, MFA
  flows, with a pre-built `eduPreset`, wired to `@arcevo/facet-sdk`
- `@arcevo/facet-sdk` — `ArcIdClient`, the arc-id identity-platform client
  (auth, tenants, roles/permissions, audit, IdP)

**Identity, roles, tenancy (School), and the auth audit trail are arc-id's
job via `facet-sdk` and `facet-auth`'s `eduPreset` — do not build a local
Counselor/SchoolAdmin/Admin role table or a local AuditLog.** StreamWise's
own database only holds StreamWise's domain data (see schema below).

## Stack

- Next.js (App Router) + TypeScript
- `@arcevo/facet-*` for all UI, layout, auth, tokens
- Prisma + PostgreSQL for domain data only
- `ArcIdClient` from `facet-sdk` for all identity/tenant/role calls

## Data model (StreamWise-owned only)

Design a Prisma schema covering, at minimum:

- `StudentProfile` — links to an arc-id user id (string, not a local FK to
  a users table); JSS3/SS1 academic record
- `RiasecResponse`, `BfiResponse` — versioned instrument responses
  (`instrumentVersion` field so item-set changes don't corrupt history)
- `SubjectCatalog`, `TradeSubject` — versioned by `academicSession`
  (e.g. "2025/2026"), not hardcoded enums — NERDC changes this
- `JambRequirement` — versioned by `admissionCycle`, course → required
  subjects mapping
- `AhpWeightSet` — the pairwise-comparison matrix, derived weights, and
  Consistency Ratio actually used for a given recommendation, versioned
  and immutable once used (never mutate a weight set a recommendation
  already references)
- `RecommendationLog` — full input snapshot (academic + RIASEC + BFI +
  weight-set version + JAMB requirement version used), output (ranked
  streams, confidence level, guidance-insight text), and a foreign key to
  the arc-id user id — this is StreamWise's own audit trail, distinct from
  arc-id's

## AHP-SAW engine

Implement as a pure, framework-agnostic module (no React, no DB calls
inside it) so it's independently testable:

- `computeAhpWeights(pairwiseMatrix): { weights, consistencyRatio }` —
  reject (throw) if CR > 0.10, per Chapter 2 §2.3.6
- `scoreStreams(studentProfile, weights, subjectCatalog): RankedStream[]` —
  SAW normalization + weighted sum, per §2.3.7
- `validateJambPrerequisites(recommendedStream, careerGoal, jambRequirements)`
  — separate module, not folded into scoring (per §2.6 — this is an
  independent failure mode from stream fit)
- `explainRecommendation(rankedStreams, weights): string` — per-criterion
  contribution breakdown feeding the guidance-insight text (this is what
  makes H₀₃ from Chapter 1 testable — see §2.4.5)

## Pages / flow

1. **Landing / consent page** (`/`) — see spec below. Uses
   `LandingLayout` from `facet-layout` with `eduLayoutPreset`.
2. **Auth** — `ArcProvider` + `eduPreset` from `facet-auth`; `SignIn`/
   `SignUp` components as-is; wrap authenticated routes in `Guard`.
3. **Assessment flow** — academic record entry, RIASEC (48 items), BFI
   (20 items), career-goal input.
4. **Results page** — ranked streams, confidence level, guidance-insight
   explanation, JAMB validator result — inside `ConsoleLayout`.
5. **Counselor/school view** — a `TenantSwitcher`-aware view scoped by
   arc-id tenant/role claims (no local role table needed — check the
   claims `ArcIdClient` returns).

## Landing / consent page — detailed spec

Route: `/`. Do not require auth to view this page.

**Layout**: `LandingLayout` from `@arcevo/facet-layout`, `eduLayoutPreset`
as the base `BrandConfig`/features, overridden with StreamWise's own
`brand.name` and `brand.logo`.

**Logo**: Source Lagos State University's official logo from LASU's own
site (lasu.edu.ng) — do not use a random search-result image. Flag it back
to the user for confirmation that they have the right to display it
(it's an institutional mark, not the team's own IP) before shipping.

**Content**:
- Product name/wordmark + short one-line description of StreamWise
- A **consent card** (use `Card` from `facet-components`) containing:
  - A short, plain-language protocol paragraph: what the tool is
    (an educational research project, not an official LASU/NERDC/JAMB
    product), what data is collected (academic record, RIASEC/BFI
    responses, career goal), how it's used (to generate a stream
    recommendation only), that it does not replace a qualified guidance
    counsellor, and that the person confirms they are voluntarily
    participating in an academic project
  - 3–4 individual `Checkbox` items (not one bundled checkbox), each
    tied to one specific consent point, e.g.:
    - "I understand this is a final-year academic project, not an
      official LASU, NERDC, or JAMB service."
    - "I consent to my academic, RIASEC, and personality responses
      being used to generate a recommendation and being logged for
      this study's evaluation."
    - "I understand StreamWise's recommendation is a decision *aid*,
      not a replacement for a qualified guidance counsellor."
    - "I am providing this information voluntarily and may stop at
      any time."
- A single **"Explore StreamWise"** `Button` (primary variant) that is
  `disabled` until all checkboxes are checked (React state — `useState`
  array or a `Set` of checked ids, `disabled={!allChecked}`). On click,
  route to `/auth/sign-up` or `/assessment` depending on auth state.
- No dark patterns: don't pre-check any box, don't hide the button behind
  a fake "loading" state, don't make declining harder than accepting —
  if a required box is unchecked, just leave the button inert with a
  small helper line ("Check all boxes to continue"), nothing punitive.

## What NOT to build

- No local role/permission enum — use arc-id claims via `facet-sdk`
- No local AuditLog table — that's arc-id's job for auth events;
  `RecommendationLog` is domain data, not an auth audit trail
- No custom design tokens or component library — use `facet-tokens` /
  `facet-components` as-is; only extend via `IconProvider`/`registerIcon`
  if a semantic icon is missing, not by hand-rolling new components
- No hardcoded 3-stream enum or hardcoded JAMB subject lists in code —
  these are versioned catalog tables (see schema above), because both
  NERDC curricula and JAMB requirements change between academic sessions

## Deliverable order

1. Prisma schema + migrations for the domain model above
2. AHP-SAW engine as pure, unit-tested TypeScript module
3. Landing/consent page
4. Auth wiring (`ArcProvider` + `eduPreset` + `Guard`)
5. Assessment flow + results page
6. Counselor/tenant view
7. Seed data for one academic session + one admission cycle so the app
   is demoable end-to-end