# Implementation status

## Phase 2 — Landing page ✅

**Done** (`src/app/page.tsx`, `src/components/landing/*`)
- Sticky nav (wordmark, Team Mavericks · SIH 2026, section links, theme toggle, Launch demo).
- Hero with the animated lifecycle: one FDR card moves through all 10 states while each step stamps an
  event into a real SHA-256 chain (Web Crypto, `src/lib/audit-chain.ts`). It loops, pauses on mouse hover
  or keyboard focus, offers clickable steps and a play/pause control, pauses off-screen, and doesn't
  auto-advance under reduced motion. "Watch the lifecycle" restarts it and scrolls to it.
- Problem (4 pains), How it works (5 steps, scroll reveal), Capabilities (6 cards with UI fragments;
  maturity radar, Clause 6.46 checklist and audit chain read the live demo store, and "Verify integrity"
  re-hashes the whole chain), Guardrails, Architecture (SVG, separate desktop/mobile layouts, labelled
  production target), live stats strip, final CTA, footer with disclaimer.

**Verified**
- 1440px and 375px in light and dark; no horizontal overflow at 375px; no console errors.
- Lifecycle loop advances, wraps and holds a constant height (no layout shift); Verify integrity
  reports 27 events intact.
- Not verified in a real reduced-motion setting (the browser pane can't emulate it); the code path is
  `useReducedMotion` → no auto-advance, plus the global reduced-motion CSS.

## Phase 1 — Foundation ✅

**Done**
- Next.js 15 (App Router, TS strict, pnpm, `src/`), Tailwind v4, shadcn/ui (Radix), lucide-react, motion,
  Zustand, TanStack Table v8, cmdk, Geist Sans/Mono. Light + dark tokens (`src/app/globals.css`).
- Base components: `StatusBadge` (every instrument, obligation, case, release, clearance, document,
  finding, checklist and job state; icon + text, never colour alone), `MoneyText`, `DateText`, `IdText`,
  `PageHeader`, `EmptyState`, `DataTable`, `StatCard`.
- Typed domain (`src/types`) and deterministic, today-relative seed (`src/data`): 8 institutions,
  12 obligations, 26 instruments, 38 documents, 35 extractions, 7 cases covering all six required stories,
  2 release requests, 8 clearances, a 3-generation renewal chain, policy rules, three separate checklists,
  notifications, workflow events, jobs, 27 sealed audit events.
- Reconciled with `docs/brief.md`: instrument states §7.2, release states §7.3, clearance states §7.4,
  least-privilege role matrix §2.1. Six Clause 6.46 items (`FROM BRIEF`), clearance sources PGRC /
  Vigilance Cell / Approval Bureau / Finance, "Ready for authorised decision" label, and decisions that
  require a reason + reference number (Approver only). Annexure items stay `DEMO CONFIG`.
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
- `pnpm test` — 19/19 passing (seed shape, chain validity, tamper detection, authz matrix + tenant scope,
  clean approval, critical-finding block, full release flow, renewal lineage, release submission,
  finding → correction → reset, decision reference required, Clause 6.46 items + clearance sources, DD MMM YYYY dates,
  §2.1 least privilege, §7.4 clearance rules, assigned-clearance enforcement)
- `pnpm build` — 24 static routes
- Manual: `/enter` → Institution Owner → `/institution`; role switch to Approver; `/official/audit` blocked
  for Approver; `/institution` redirects an official to `/official`; light/dark; no console errors.

**Known gaps**
- Frontend-only by design (one-day scope): no backend, database or real auth. The production target is described in docs/architecture.md.
- No UI calls the store commands yet — they are exercised by tests; Phase 3/4 screens wire them up.

**Next step**
- Phase 3: Institution Portal — overview, deposit register + lineage, document centre, release wizard, request timeline.
