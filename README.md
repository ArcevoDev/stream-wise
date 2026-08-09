# StreamWise : Weighted Decision Support System

A final-year research project that recommends an academic stream (**Science /
Humanities / Business**) to Nigerian SS2 students using an **AHP-SAW**
multi-criteria decision engine.

Inputs: JSS3/SS1 academic scores · 48-item RIASEC vocational interest quiz ·
20-item BFI-20 personality questionnaire. Output: a ranked stream
recommendation with a confidence level, plain-language guidance, AHP weight
transparency, and a JAMB O'Level subject-combination validator against a
seeded university-course catalog.

> Research note: this is an academic project, not an official LASU, NERDC, or
> JAMB service. It is a decision *aid*, not a replacement for a qualified
> guidance counsellor.

## Stack

- **Frontend:** React 19 + Vite 5 + TailwindCSS + React Router 6 (Vercel static)
- **UI:** `@arcevo/facet-components` + `@arcevo/facet-layout` + `@arcevo/facet-tokens`
  (OKLCH tokens, dark-first) : the only UI foundation. No legacy `components/ui/`.
- **Backend:** Express 4 + TypeScript (ESM) + Zod (Express API, reverse proxy)
- **Database:** PostgreSQL + Prisma 7 (adapter-pg, generated TS client)
- **Engine:** pure TS modules in `server/src/engine/` (AHP, SAW, RIASEC, BFI,
  confidence, jamb, rescore) : zero DB/HTTP coupling, unit-testable
- **Auth:** minimal JWT (7d expiry, bcrypt-12), role claim on token,
  `requireRole` guard. arc-id / `facet-auth` is **deferred** (see AGENTS.md).
- **Package manager:** pnpm workspaces (client + server)

## Quick start

```bash
pnpm install

# Server env
cp server/.env.example server/.env
# edit server/.env → set DATABASE_URL (+ JWT_SECRET for production)

# Migrate + seed (catalogs, weight set, JAMB courses, demo role accounts)
cd server
pnpm prisma generate
pnpm prisma migrate dev
pnpm seed            # academic session, subject catalog, ahp-v1.0 weight set, JAMB catalog
pnpm seed:roles      # demo accounts for every role (see below)
cd ..

# Dev servers (from root)
pnpm dev             # client :5173 · server :5000
```

The Prisma 7 generated client is **not committed** : run `pnpm prisma
generate` on every fresh checkout (the server postinstall also does it).

## Demo role accounts (research access story)

`pnpm seed:roles` creates one account per role so supervisors and the project
owner can test every role-gated surface without orchestrating signups. Safe to
re-run (upserts by email). Credentials:

| Role           | Email                 | Password         | Landed at |
| -------------- | --------------------- | ---------------- | --------- |
| STUDENT        | `student@dss.test`    | `Student123!`    | `/scores` (or `/history` if a recommendation exists) |
| COUNSELOR      | `counselor@dss.test`  | `Counselor123!`  | `/admin` (read-only) |
| SCHOOL_ADMIN   | `schooladmin@dss.test`| `SchoolAdmin123!`| `/admin` (read-only) |
| ADMIN          | `ADMIN_EMAIL` env     | `ADMIN_PASSWORD` env | `/admin` (full) |

- The ADMIN account reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`
  (defaults: `dss.admin@example.com` / `change-me-now`).
- Demo accounts carry a fixed email domain so they can be excluded from thesis
  statistics later (research-integrity note).
- The demo STUDENT has consent pre-granted so the assessment flow can be
  entered directly.

## Role model

- `Student.role` + JWT role claim + `requireRole(...)` is the RBAC model.
- Client routing is role-aware: `STUDENT` → assessment flow; `COUNSELOR`,
  `SCHOOL_ADMIN`, `ADMIN` → staff console (`/admin`).
- `/admin` is open to all staff roles as a **read-only** surface for non-ADMIN
  accounts. The server enforces every mutation with `requireRole(ADMIN)`:
  CSV export and re-scoring (`POST /api/admin/rescore/:studentId`) return 403
  for counselors. The client hides those affordances for non-ADMIN roles.

## Decision engine

Pure ESM modules in `server/src/engine/` : no DB calls, no Express:

- `ahp.ts` : `computeAhpWeights(pairwiseMatrix)`; **throws** when CR > 0.10
  (Saaty rejection).
- `saw.ts` : `computeSAW(academic, riasec, personality, weights, traitMapping)`
  with the personality→stream 3-trait mapping (thesis §3.5.3):
  Science = O+C+ES · Humanities = O+A+ES · Business = E+C+ES, where
  **ES (Emotional Stability) = 100 − neuroticism** (P0-3e).
- `riasec.ts` / `bfi.ts` : instrument scoring (48-item RIASEC, 20-item BFI).
- `confidence.ts` : CL min-max rescale to [50, 100]; per-criterion
  contribution breakdown (`explainRecommendation`).
- `jamb.ts` : pure `validateJambPrerequisites`.
- `rescore.ts` : re-computes RIASEC + BFI profiles from raw rows.

Criterion weights [0.540, 0.297, 0.163] come from 5 guidance counsellors'
expert judgement (thesis §3.5.2), seeded as an immutable `AhpWeightSet` row
(CR ≈ 0.007). The engine consumes weights as parameters : no module-level
weight constants. `algorithmVersion = ahp-saw-v1.1`.

## Methodology guardrails (research integrity)

- **No fake data:** a student who skips BFI is never injected neutral scores
  at full weight. The personality weight is renormalized over the criteria
  present and the result is flagged `personalitySource: "renormalized"`.
- **Consent gate:** the assessment flow and recommendation generation require
  a "granted" consent record (4 ethics points, versioned). Server-side
  enforcement backs up the client gate.
- **Versioned catalogs:** `AcademicSession`, `SubjectCatalog`,
  `AhpWeightSet`, and `JambCourse.admissionCycle` pin what was true at
  recommendation time; `RecommendationLog` snapshots inputs + weight-set FK +
  algorithm version for the audit trail.
- **Re-scoring:** `POST /api/admin/rescore/:studentId` recomputes profiles
  from raw instrument rows (which carry `instrumentVersion`) and flags drift :
  never mutates.

## API surface

| Method | Route | Auth | Purpose |
| ------ | ----- | ---- | ------- |
| POST | `/api/auth/register` | public | Create student account |
| POST | `/api/auth/login` | public | JWT login |
| POST | `/api/auth/guest` | public | Synthetic reviewer session (no DB row) |
| GET | `/api/auth/profile` | token | Identity + consent status |
| POST | `/api/auth/consent` | token | Record 4-point consent |
| GET | `/api/auth/progress` | STUDENT | Resume-step routing |
| GET | `/api/auth/role` | staff roles | Introspect own role claim |
| POST | `/api/profile/scores` | STUDENT | Save academic scores |
| GET | `/api/profile` | STUDENT | Own academic profile |
| GET | `/api/riasec/questions` | public | Fetch 48 items |
| POST | `/api/riasec/submit` | STUDENT | Submit + compute profile |
| GET | `/api/riasec` | STUDENT | Own RIASEC profile |
| GET | `/api/bfi/questions` | public | Fetch 20 items |
| POST | `/api/bfi/submit` | STUDENT | Submit + compute profile |
| GET | `/api/bfi` | STUDENT | Own BFI profile |
| POST | `/api/recommend` | STUDENT | Generate recommendation (POST, no GET side effect) |
| GET | `/api/recommend/history` | STUDENT | Paginated history |
| GET | `/api/recommend/history/:id` | STUDENT | Single recommendation |
| DELETE | `/api/recommend/history` | STUDENT | Clear own history |
| GET | `/api/jamb/catalog` | public | University course catalog |
| POST | `/api/jamb/validate` | STUDENT | Validate subject combination |
| GET | `/api/jamb/history` | STUDENT | JAMB validation history |
| GET | `/api/admin/stats` | staff | Dashboard stats |
| GET | `/api/admin/analytics` | staff | Analytics charts |
| GET | `/api/admin/students` | staff | Paginated student list |
| GET | `/api/admin/students/:id` | staff | Student detail |
| GET | `/api/admin/audit` | staff | Audit log |
| GET | `/api/admin/export/csv` | ADMIN | CSV export |
| POST | `/api/admin/rescore/:studentId` | ADMIN | Re-score from raw rows |

Errors are a unified `{ error: string, details?: [...] }` envelope. Route auth
is `authenticateToken` then `requireRole(...)`.

## Tests

Engine code is deliberately dependency-free so it can be unit tested. **Vitest
is configured and running (P1-1, shipped 2026-08-07)** : 44 tests across 8
files under `server/src/engine/` (ahp, bfi, riasec, saw, jamb, confidence,
rescore, validation-simulation). Run with `pnpm --filter server test`. The
100-profile validation simulation (validation-simulation.test.ts) is the
thesis "Validation Testing" evidence (§3.8) : it verifies zero re-scoring
drift and ≥95/100 ground-truth agreement on synthetic profiles. Test vectors
pin the P0-3e 3-trait personality mapping (O+C+ES / O+A+ES / E+C+ES) and the
derived `emotionalStabilityScore`.

## Deploy notes

- **Client → Vercel** as a static SPA. `vercel.json` sets `buildCommand =
  "pnpm build"` (tsc -b && vite build), `outputDirectory = "dist"`, the SPA
  rewrite, and security headers. The Root Directory is **not** in vercel.json
  : set it to `client` in the Vercel dashboard (Project → Settings → General).
- **Server → Netlify** as a serverless function. `netlify.toml` sets
  `build = "pnpm --filter server build"`, publish dir `public`, functions dir
  `server/functions`, and rewrites `/api/*` to the `api` function (wired via
  `serverless-http`). `server/functions/api.ts` imports the compiled
  `dist/src/app.js`.
- Netlify env vars required: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`,
  `NODE_ENV=production`. Set `VITE_API_BASE_URL` in Vercel to the Netlify
  site origin (e.g. `https://streamwise-dss.netlify.app`).
- Netlify does **not** run database migrations and does **not** host
  Postgres. Point `DATABASE_URL` at any Postgres host (Neon / Supabase /
  self-hosted) and apply migrations from your terminal once:
  `pnpm --filter server prisma:deploy` (then `seed` + `seed:roles` on a fresh
  DB). The Netlify build only runs `prisma generate` (via postinstall); the
  generated client is not committed.
- The client keeps its domain enums local (`client/src/types/index.ts`), so
  the Vercel static build has zero coupling to `prisma generate`.
- CORS allowlist is configurable via `CLIENT_URL` (comma-separated) plus
  `*.vercel.app`, `*.netlify.app`, and `*.arcevocirqle.com.ng` subdomains.

## Docs

- `AGENTS.md` : the always-read agent contract (current-state rules).
- `CLAUDE.md` : original rebuild spec (aspirational; where it conflicts with
  the code, AGENTS.md + the code are reality).
- `todo.txt` (repo root, untracked) : session scratchpad / current work plan.
