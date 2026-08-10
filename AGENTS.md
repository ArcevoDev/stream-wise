# DSS Project : Agent Session Rules

> Loaded automatically at the start of every session. This is the always-read
> contract for AI agents working in this repo. It reflects what ACTUALLY
> exists in the codebase as of 2026-08-09. If anything here disagrees with
> `CLAUDE.md`, this file is the source of truth : `CLAUDE.md` is the original
> (aspirational) rebuild spec.

## What this is

DSS (Weighted Decision Support System) : final-year project. A web app that
recommends an academic stream (Science / Humanities / Business) to Nigerian
SS2 students using an AHP-SAW multi-criteria decision engine.

- **Stack:** React 19 + Vite 5 + TailwindCSS + React Router (client) ·
  Express 4 + TypeScript ESM + Zod (server) · PostgreSQL + Prisma 7
  (`@prisma/adapter-pg`, generated TS client) · JWT auth
- **UI:** `@arcevo/facet-components` + `@arcevo/facet-layout` +
  `@arcevo/facet-tokens` (OKLCH tokens, dark-first). There is no
  `components/ui/` dir. Hand-rolled primitives that facet doesn't ship:
  `client/src/components/Alert.tsx`, plus thin wrappers
  (`ProgressBar`, `ConfidenceGauge`, `GuidanceInsights`, `StreamCard`,
  `PasswordInput`, `ThemeToggle`, `BrandLogo`, `SiteNav`, `AccountMenu`).
- **Engine:** pure TS modules in `server/src/engine/` (AHP, SAW, RIASEC, BFI,
  confidence, jamb, rescore) : zero DB/HTTP coupling. Never import Prisma or
  Express here. The personality→stream mapping is a 3-trait mean per stream
  (P0-3e): Science = O+C+ES, Humanities = O+A+ES, Business = E+C+ES, where
  ES (Emotional Stability) = 100 − neuroticism. See `saw.ts`.
- **Package manager:** pnpm workspaces (client + server). The client keeps
  its domain enums LOCAL in `client/src/types/index.ts` — it does NOT import
  from the server workspace. That export-independence is why the Vercel
  static build has zero coupling to `prisma generate`.

## Non-negotiable rules

1. **State docs:** `AGENTS.md` (this file) + `README.md` are the source of
   truth for how the repo works. There is no `.agent/` directory anymore
   (it was gitignored and removed); session scratch goes in `todo.txt` at
   the repo root (kept untracked). If you reference `.agent/output.txt` you
   are reading stale docs — fix the doc.
2. **Before writing any code, check:**
   - Does the route/controller/module already exist? (`server/src/modules/*`,
     mounted in `server/src/app.ts`)
   - Does the Prisma model already have the columns? (`server/prisma/schema.prisma`)
   - Is there a matching Zod schema? (`server/src/validators/schemas.ts`)
   - Is there a client page/component already? (`client/src/pages`, `client/src/components`)
3. **Server conventions:** controllers stay thin; validation via
   `validateBody`/`validateQuery` middleware (Zod); errors are
   `{ error: string }` (+ `details` for validation). Never `throw` inside a
   handler : use `asyncHandler`. Route auth via `authenticateToken` then
   `requireRole(...)` when a route is role-restricted. Student-owned routes
   (/profile, /riasec, /bfi, /recommend, /jamb) use `requireRole(STUDENT)`;
   /auth/profile, /auth/consent, /auth/role stay role-flexible (identity
   endpoints).
4. **Client conventions:** all API calls through the shared axios instance
   (`client/src/api/axios.ts`); auth state via `useAuth()` from
   `client/src/context/AuthContext`; **all UI from `@arcevo/facet-components`**.
   No `components/ui/`, no hardcoded `window.location.href` redirects for
   normal navigation (SPA routing only; the axios 401/403 interceptor is the
   one place that clears a dead session).
5. **Never store secrets in code** : everything goes in `server/.env`
   (copy of `server/.env.example`, gitignored). Netlify env vars replace it
   in the cloud.
6. **Tests:** engine code is deliberately dependency-free so it can be unit
   tested. Runner: Vitest (44 tests across 8 files, `pnpm --filter server
   test`). If you touch `server/src/engine/`, add/extend tests. The P0-3e
   3-trait mapping + derived `emotionalStabilityScore` are pinned by test
   vectors (incl. the 100-profile validation simulation, thesis §3.8).
7. **Deployment:** client builds to Vercel as a static SPA; server runs on
   Netlify as a serverless function (see `netlify.toml`). The `app.listen()`
   call is guarded by `IS_MAIN && !IS_SERVERLESS` in `server/src/app.ts` so
   the Lambda sandbox never binds a port. Required Netlify env vars:
   `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`; Vercel
   needs `VITE_API_BASE_URL` set to the Netlify origin. `prisma generate`
   must run on deploy (postinstall) : the Prisma 7 generated client is NOT
   committed (`.gitignore` excludes `server/prisma/generated/`).
8. **FIX (Bug x.y) comments** are the codebase's way of marking known
   workarounds : resolve them when the underlying issue is fixed, and delete
   the comment when you do.

## Auth / identity decision (2026-08-06)

**DSS keeps its own minimal JWT auth** (`server/src/modules/auth/`). Concrete
rules:

- `Student.role` + JWT role claim + `requireRole` is the RBAC model. Roles:
  `STUDENT`, `COUNSELOR`, `SCHOOL_ADMIN`, `ADMIN` (+ a synthetic `GUEST`
  reviewer role minted by `POST /auth/guest`, which has no DB row and is
  rejected by every `requireRole`).
- Admin account is seeded via `pnpm create:admin` (reads `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` from env). All four role accounts are seeded via
  `pnpm seed:roles` (demo logins for supervisors testing the research build).
- **Role-aware client routing:** `STUDENT` → assessment flow;
  `COUNSELOR` / `SCHOOL_ADMIN` / `ADMIN` → `/admin` (read-only console for
  non-ADMIN client-side; the server is the real gate — `/admin/export/csv`
  and `/admin/rescore/:studentId` are `requireRole(ADMIN)`).
- arc-id (`@arcevo/facet-auth` + `@arcevo/facet-sdk`) is the **future**
  canonical identity system, NOT wired in yet. Do not add it until
  production-ready. `Student.arcId` (`@unique`, nullable) is the migration
  surface.

## Current status (condensed)

- **P0 COMPLETE:** versioned domain catalogs + weight sets
  (AcademicSession/SubjectCatalog/AhpWeightSet), engine seams re-wired
  (computeAhpWeights throws on CR>0.10, computeSAW takes weights + mappings
  as params, validateJambPrerequisites pure, explainRecommendation
  per-criterion breakdown), P0-3e neuroticism→Emotional Stability
  (100 − neuroticism), consent capture + gating live (POST /auth/consent +
  /consent page), instrumentVersion stamped on responses, admin re-scoring
  (POST /admin/rescore/:studentId).
- **Done (P1):** AuditLog writes on key actions, JAMB validator uses the
  student's real SubjectScore rows, requireRole(STUDENT) on all
  student-owned routes, POST /recommend (no GET side effect), unified
  `{ error, details? }` envelope, paginated history, client `.env.example`.
- **Done (2026-08-07):** role-aware staff landing, demo role accounts,
  glass-card + pill-navbar UI shell, `ThemeProvider defaultTheme="system"`,
  plain light/dark ThemeToggle, circular LASU badge, single navbar.
- **Done (2026-08-08):** engine test suite live (44 tests incl. the
  100-profile validation simulation), history page as the student
  mini-dashboard, draft autosave (`useLocalDraft`) on entry forms, returning
  students with a prior recommendation land on `/history`, resume-step
  routing (`useResumeStep` + GET /auth/progress).
- **Done (2026-08-09, deploy):** Netlify serverless deployment (see
  `netlify.toml`, `server/functions/api.cjs`, `serverless-http`), Vercel
  client config (see `client/vercel.json`; note `rootDirectory` is set to
  `client` in the dashboard, so Vercel reads the config from the client dir,
  NOT the repo root), CORS for `*.vercel.app` / `*.netlify.app`
  / `*.arcevocirqle.com.ng`, listen guard, `.env.example` docs.
- **Next:** profile editing (career aspiration, school) + per-page step
  guards (deep-linking to a later step : the server POSTs are the
  enforcement today). Then P2 (counselor portal depth, admin CRUD, CSV/PDF
  export polish, auth hardening, docs).

## File naming

- Server: `src/modules/<name>/<name>.routes.ts` + `<name>.controller.ts` ·
  engine files `<name>.ts` (singular: `ahp.ts`, `saw.ts`, `riasec.ts`, `bfi.ts`)
- Client: `src/pages/<PageName>.tsx` · `src/components/<ComponentName>.tsx`
