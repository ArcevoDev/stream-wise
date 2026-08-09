# DSS Project : Agent Session Rules

> Loaded automatically at the start of every session. This is the always-read
> contract for AI agents working in this repo. If anything here disagrees with
> `CLAUDE.md` or the roadmap, `CLAUDE.md` is the source of truth : fix this
> file to match it, not the other way round.

## What this is

DSS (Weighted Decision Support System) : final-year project. A web app that
recommends an academic stream (Science / Humanities / Business) to Nigerian
SS2 students using an AHP-SAW multi-criteria decision engine.

- **Stack:** React 19 + Vite 5 + TailwindCSS + React Router (client) ·
  Express 4 + TypeScript ESM + Zod (server) · PostgreSQL + Prisma 7 · JWT auth
- **UI:** `@arcevo/facet-components` + `@arcevo/facet-layout` +
  `@arcevo/facet-tokens` (OKLCH tokens, dark-first) : the canonical UI
  foundation. No legacy shadcn-style `components/ui/` primitives remain.
- **Engine:** pure TS modules in `server/src/engine/` (AHP, SAW, RIASEC, BFI,
  confidence, jamb, rescore) : zero DB/HTTP coupling. Never import Prisma or
  Express here. The personality→stream mapping is a 3-trait mean per stream
  (P0-3e): Science = O+C+ES, Humanities = O+A+ES, Business = E+C+ES, where
  ES (Emotional Stability) = 100 − neuroticism. See `saw.ts`.
- **Package manager:** pnpm workspaces. Client depends on `server` workspace
  for generated Prisma enums (`server/enums`) : do not break that export.

## Non-negotiable rules

1. **Read `.agent/output.txt` first** : it is the live status dashboard +
   priority roadmap. It is authoritative and must be updated after every
   significant milestone. Append to it; never delete the roadmap section.
2. **Before writing any code, check:**
   - Does the route/controller/module already exist? (`server/src/modules/*`,
     mounted in `server/src/app.ts`)
   - Does the Prisma model already have the columns? (`server/prisma/schema.prisma`)
   - Is there a matching Zod schema? (`server/src/validators/schemas.ts`)
   - Is there a client page/component already? (`client/src/pages`, `client/src/components`)
3. **Server conventions:** controllers stay thin; validation via
   `validateBody`/`validateQuery` middleware; errors are `{ error: string }`
   (+ `details` for validation). Never `throw` inside a handler : use
   `asyncHandler`. Route auth via `authenticateToken` then `requireRole(...)`
   when a route is role-restricted. Student-owned routes (/profile, /riasec,
   /bfi, /recommend, /jamb) use `requireRole(STUDENT)`; /auth/profile and
   /auth/consent stay role-flexible (identity endpoints).
4. **Client conventions:** all API calls through the shared axios instance
   (`client/src/api/axios.ts`); auth state via `useAuth()` from
   `AuthContext`; **all UI from `@arcevo/facet-components`** : there is no
   `components/ui/` dir, don't recreate it; the only hand-rolled primitives
   are `Alert.tsx` (facet ships no Alert) and thin wrapper components;
   no hardcoded `window.location.href` redirects (SPA routing only).
5. **Never store secrets in code** : everything goes in `server/.env`
   (copy of `server/.env.example`). Never edit `server/.env` into git.
6. **Tests:** engine code is deliberately dependency-free so it can be unit
   tested. If you touch `server/src/engine/`, add/extend tests. Test runner:
   Vitest (P1-1 : shipped 2026-08-07; 44 tests, run `pnpm --filter server
   test`). The P0-3e 3-trait personality mapping and derived
   `emotionalStabilityScore` are pinned by the test vectors (incl. the
   100-profile validation simulation for thesis §3.8).
7. **Deployment:** client builds to Vercel; server runs behind a reverse
   proxy. `prisma generate` must be part of any deploy : the Prisma 7
   generated client is NOT committed (`.gitignore` excludes
   `server/prisma/generated/`); only `server/enums` (the generated enum
   module the client imports) is re-exported via the server package.
8. **FIX (Bug x.y) comments** are the codebase's way of marking known
   workarounds : resolve them when the underlying issue is fixed, and delete
   the comment when you do.

## Auth / identity decision (2026-08-06)

**DSS keeps its own minimal JWT auth** (`server/src/modules/auth/`). Concrete
rules:

- `Student.role` + JWT role claim + `requireRole` is the RBAC model. Admin
  account is seeded via `pnpm create:admin` (reads `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` from env). All four role accounts (STUDENT/COUNSELOR/
  SCHOOL_ADMIN/ADMIN) are seeded via `pnpm seed:roles` (see README : the demo
  logins for supervisors testing the research build).
- **Role-aware client routing (2026-08-07):** `STUDENT` → assessment flow;
  `COUNSELOR` / `SCHOOL_ADMIN` / `ADMIN` → `/admin`. The staff console is
  read-only for non-ADMIN roles client-side, but the server is the real gate:
  any ADMIN-only route (`/admin/export/csv`, `/admin/rescore/:id`) returns
  403 for non-ADMIN via `requireRole(ADMIN)`.
- arc-id (`@arcevo/facet-auth` + `@arcevo/facet-sdk`) is the **future**
  canonical identity system, but is NOT wired in yet : it's still in
  development and not safe to integrate. Do not add it until arc-id is
  production-ready. The schema already carries a nullable `Student.arcId`
  (`@unique`) as the migration surface.
- The `@arcevo/facet-*` UI packages (components/layout/tokens) ARE in use.
  Only `facet-auth` and `facet-sdk` are deferred.

## Current status (condensed : full detail in `.agent/output.txt`)

- **P0 COMPLETE (2026-08-06):** versioned domain catalogs + weight sets
  (AcademicSession/SubjectCatalog/AhpWeightSet), engine seams re-wired
  (computeAhpWeights throws on CR>0.10, computeSAW takes weights + mappings as
  params, validateJambPrerequisites pure, explainRecommendation per-criterion
  breakdown), methodology pinning done incl. **P0-3e: neuroticism included as
  Emotional Stability (100 − neuroticism) : a 5-factor positive driver for
  all three streams** (saw.ts/bfi.ts/domain.ts/recommend.controller.ts),
  consent capture + gating live (POST /api/auth/consent + /consent page),
  instrumentVersion stamped on responses, admin re-scoring endpoint live
  (POST /api/admin/rescore/:studentId).
- **Done (P1):** AuditLog writes on all six key actions, JAMB validator uses
  the student's real SubjectScore rows, requireRole(STUDENT) on all
  student-owned routes, POST /recommend (no GET side effect), unified
  `{ error, details? }` envelope, paginated history, client `.env.example`.
- **Done (2026-08-07):** role-aware staff landing (staff → `/admin` read-only),
  demo role accounts documented, glass-card + pill-navbar UI shell polish,
  `ThemeProvider defaultTheme="system"`, plain light/dark ThemeToggle, circular
  LASU badge, double-navbar on `/` removed.
- **Done (2026-08-08):** engine test suite live (Vitest, 44 tests incl. the
  100-profile validation simulation), history page (`/history`) as the student
  mini-dashboard, draft autosave (`useLocalDraft`) on every entry form (cleared
  on submit), returning students with a prior recommendation land on `/history`,
  resume-step routing live (`useResumeStep` + GET /auth/progress : login/logout/
  refresh land students back where they stopped).
- **Done (migration):** client is on React 19 + `@arcevo/facet-*` for all UI;
  `components/ui/` purged; `facet-layout` wired into the app shell.
- **Next:** profile editing (career aspiration, school) + per-page step guards
  (deep-linking to a later step : the server POSTs are the enforcement today).
  Then P2.
- **Known gaps:** profile editing, per-page step guards, P2 (counselor portal,
  admin CRUD, CSV/PDF export, auth hardening, docs).

## File naming

- Server: `src/modules/<name>/<name>.routes.ts` + `<name>.controller.ts` ·
  engine files `<name>.ts` (singular: `ahp.ts`, `saw.ts`, `riasec.ts`, `bfi.ts`)
- Client: `src/pages/<PageName>.tsx` · `src/components/<ComponentName>.tsx`
