# DSS Project — Agent Session Rules

> Loaded automatically at the start of every session. This is the always-read
> contract for AI agents working in this repo. If anything here disagrees with
> `CLAUDE.md` or the roadmap, `CLAUDE.md` is the source of truth — fix this
> file to match it, not the other way round.

## What this is

DSS (Weighted Decision Support System) — final-year project. A web app that
recommends an academic stream (Science / Humanities / Business) to Nigerian
SS2 students using an AHP-SAW multi-criteria decision engine.

- **Stack:** React 18 + Vite 5 + TailwindCSS + React Router (client) ·
  Express 4 + TypeScript ESM + Zod (server) · PostgreSQL + Prisma 7 · JWT auth
- **Engine:** pure TS modules in `server/src/engine/` (AHP, SAW, RIASEC, BFI,
  confidence) — zero DB/HTTP coupling. Never import Prisma or Express here.
- **Package manager:** pnpm workspaces. Client depends on `server` workspace
  for generated Prisma enums (`server/enums`) — do not break that export.

## Non-negotiable rules

1. **Read `.agent/output.txt` first** — it is the live status dashboard +
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
   (+ `details` for validation). Never `throw` inside a handler — use
   `asyncHandler`. Route auth via `authenticateToken` then `requireRole(...)`
   when a route is role-restricted.
4. **Client conventions:** all API calls through the shared axios instance
   (`client/src/api/axios.ts`); auth state via `useAuth()` from
   `AuthContext`; shadcn-style primitives in `client/src/components/ui/`;
   no hardcoded `window.location.href` redirects (SPA routing only).
5. **Never store secrets in code** — everything goes in `server/.env`
   (copy of `server/.env.example`). Never edit `server/.env` into git.
6. **Tests:** engine code is deliberately dependency-free so it can be unit
   tested. If you touch `server/src/engine/`, add/extend tests. Test runner:
   Vitest (not yet set up — see roadmap).
7. **Deployment:** client builds to Vercel; server runs behind a reverse
   proxy. `prisma generate` must be part of any deploy (Prisma 7 generated
   client is committed under `server/prisma/generated`).
8. **FIX (Bug x.y) comments** are the codebase's way of marking known
   workarounds — resolve them when the underlying issue is fixed, and delete
   the comment when you do.

## Auth / identity decision (2026-07-31)

**DSS keeps its own minimal JWT auth** (`server/src/modules/auth/`). Concrete
rules:

- `Student.role` + JWT role claim + `requireRole` is the RBAC model. Admin
  account is seeded via `pnpm create:admin` (reads `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` from env).
- arc-ui packages (`@arc-ui/*`) are NOT wired in — adoption is on hold pending
  the arc-ui decision (see `.agent/output.txt` → "INTEGRATION STATUS — arc-ui
  deferred"). Check the roadmap before adding any.

## Current status (condensed — full detail in `.agent/output.txt`)

- **Done:** full student journey (register → scores → RIASEC → BFI → results),
  AHP-SAW engine with per-stream academic affinity, JAMB O'Level validator,
  JWT role claims + `requireRole` guard + `pnpm create:admin` bootstrap,
  `RecommendationLog` explainability snapshots, and the `/api/admin/*`
  analytics API (stats, analytics, students, drill-down, audit, CSV export) —
  all role-gated and smoke-tested.
- **Next:** admin dashboard UI (`/admin` role-gated area — the API is live),
  AuditLog wiring, client auth fixes (403/429), engine unit tests, JAMB
  validator using real SubjectScore rows.
- **Known gaps:** zero tests, no admin dashboard UI (the `/api/admin/*` API is
  done), `AuditLog` never written, `requireRole` applied to admin routes only,
  client `AuthStudent` has no `role` field, hardcoded `STREAM_SUBJECTS` in the
  JAMB validator.

## File naming

- Server: `src/modules/<name>/<name>.routes.ts` + `<name>.controller.ts` ·
  engine files `<name>.ts` (singular: `ahp.ts`, `saw.ts`, `riasec.ts`, `bfi.ts`)
- Client: `src/pages/<PageName>.tsx` · `src/components/<ComponentName>.tsx`
