# Implementation status

## Phase 1 — Foundation ✅

**Done**
- Next.js 15 (App Router, TS strict, pnpm, `src/`), Tailwind v4, shadcn/ui (Radix), lucide-react, motion,
  Zustand, TanStack Table v8, cmdk, Geist Sans/Mono. Light + dark tokens (`src/app/globals.css`).
- Base components: `StatusBadge` (every instrument, obligation, case, release, clearance, document,
  finding, checklist and job state; icon + text, never colour alone), `MoneyText`, `DateText`, `IdText`,
  `PageHeader`, `EmptyState`, `DataTable`, `StatCard`.
- Typed domain (`src/types`) and deterministic, today-relative seed (`src/data`): 8 institutions,
  12 obligations, 26 instruments, 35 documents, 35 extractions, 7 cases covering all six required stories,
  2 release requests, 8 clearances, a 3-generation renewal chain, policy rules, three separate checklists,
  notifications, workflow events, jobs, 26 sealed audit events.
- Zustand store persisted to `localStorage` with `submitReleaseRequest`, `uploadDocument`, `confirmField`,
  `raiseFinding`, `requestCorrection`, `recordClearance`, `recordDecision`, `renewInstrument`, `resetDemo`.
  Each is gated by `can()`, validated by the state machines, and appends a SHA-256 hash-chained audit event.
- `/enter` with five role cards showing live "waiting for you" counts; role switcher; route gating per role;
  wrong-portal redirect.
- Portal shells for `/institution` and `/official`: sidebar (items vary by role), top bar (role switcher,
  theme toggle, reset), breadcrumbs, prototype banner, mobile sheet navigation.
- 18 portal pages with live counts and tables.

**Tests run**
- `pnpm lint` — clean
- `pnpm typecheck` — clean
- `pnpm test` — 13/13 passing (seed shape, chain validity, tamper detection, authz matrix + tenant scope,
  clean approval, critical-finding block, full release flow, renewal lineage, release submission,
  finding → correction → reset)
- `pnpm build` — 24 static routes
- Manual: `/enter` → Institution Owner → `/institution`; role switch to Approver; `/official/audit` blocked
  for Approver; `/institution` redirects an official to `/official`; light/dark; no console errors.

**Known gaps**
- No Supabase yet: schema, RLS, seed SQL and Auth are designed (docs/architecture.md) but not built.
- No UI calls the store commands yet — they are exercised by tests; Phase 3/4 screens wire them up.
- `docs/brief.md` is missing from the repo (see docs/open-questions.md #1).
- No E2E (Playwright) tests yet.

**Next step**
- Phase 2: showcase landing page `/` with the animated lifecycle hero and problem → solution story.
