# Implementation status

## Deposit Docket upgrade ✅ (branch `ccr-a039f13a-829e6f`, PR to `main`)

**Done**
- Renamed to **Deposit Docket**, Security Deposit & FDR Management Portal, Team MAVERICKS (SIH1277). Banner:
  *PROTOTYPE · SYNTHETIC DATA · NOT CONNECTED TO AICTE OR ANY BANK*. Repository name and domain unchanged.
- Replacement impact (`src/lib/replacement-impact.ts`) in the replacement form (live draft preview), the
  institution's instrument page and the official case workbench.
- Per-instrument, per-evidence-version reviews (`src/lib/reviews.ts`); successor starts with its own pending
  reviews; affected reviews reopen when a receipt changes; ready cases return to review.
- New commands: `amendReplacement` (Institution Owner) and `requestBankConfirmation` (Processing Officer,
  SIMULATED). `recordDecision` requires a decision basis and rejects stale transitions; approval re-checks
  holds, clearances and replacement impact.
- Policy corrections: no Annexure-1/2 labels on generic checklists; no universal Finance clearance; NOC after
  clearances; reminder windows labelled product settings; "unsecured" replaced with "matured without a
  recorded successor — review required".
- Judge scenario seed (`ob-kit-lab`, `fdr-kit-07`), `/enter` demo guide and "Start judge scenario" restart.
- Fixed a pre-existing hydration mismatch on `/` under reduced motion (lifecycle hint text).

**Verified**
- `pnpm test` 48/48 (30 existing, 18 new), lint, typecheck, build clean. Mutation checks: disabling the stale
  guard fails 2 tests; double-counting the original fails 3.
- Playwright, one browser: full judge scenario across Institution → Officer → Institution → Officer → Approver →
  Institution; two-tab stale-decision rejection; changed pages at 375/1440 px, light/dark, reduced motion: no
  horizontal overflow, no console errors.

**Not done / limits**
- Browser-only: no server, no shared database; controls are prototype controls, not server-side security.
- Lighthouse not re-run after this change.

Build order: 1 → 2 → **4** → 3 → 5 (Official Portal before Institution Portal, by request).

## Phase 5 — Polish and release ✅ (deployment pending)

**Done**
- ⌘K / Ctrl+K palette: pages, cases, release requests, instruments, institutions, documents and role
  switching, scoped like the routes (verified: Kaveri sees only its own records). Fixed a crash on open:
  this shadcn `CommandDialog` does not render the cmdk root itself.
- `?q=` deep links on Instruments and Institutions; own shield favicon; Open Graph metadata; 404 page;
  skip-to-content link; Reset demo has an accessible name; CSV export on Reports; unread notification
  counts in the sidebar.
- Lighthouse fixes: the hero text and /enter cards no longer wait for JavaScript to become visible; the
  lifecycle step targets are now at least 24 × 24 px.
- README rewritten for judges, with a timed two-minute demo script.

**Lighthouse (production build, local `next start`)**

| Page | Device | Perf | A11y | Best practices | SEO | LCP (simulated / observed) | CLS |
|---|---|---|---|---|---|---|---|
| `/` | Desktop | 100 | 100 | 100 | 100 | 0.8 s / 0.65 s | 0 |
| `/enter` | Desktop | 100 | 100 | 100 | 100 | 0.7 s / 0.47 s | 0 |
| `/` | Mobile | 73 | 100 | 100 | 100 | 3.4 s / 0.62 s | 0 |
| `/enter` | Mobile | 79 | 100 | 100 | 100 | 3.4 s / 0.38 s | 0 |

The filmstrip shows the headline fully painted at about first paint. The simulated mobile LCP is
inflated by hydration JavaScript (TBT about 480–760 ms under 4× CPU throttling). Portal pages need a
session, so Lighthouse (fresh profile) cannot audit them directly.

**Verified**
- 32 role × route combinations at 375 px: no horizontal overflow; no console errors.
- `pnpm test` 30/30, lint, typecheck, build clean.

**Known gaps**
- **Not deployed:** no Vercel project is linked to `aniruthan007/fdr-sentinel` yet.
- Mobile Lighthouse performance is below 90. The fix is to ship less JavaScript on public pages: load
  the demo store and seed lazily instead of in the root providers, and trim `motion` on the landing page.
- Return / On hold decisions and supervisor allocation UI are not built.

## Phase 3 — Institution Portal ✅

**Done**
- Store: `submitReleaseRequest` now requires the brief §7.3.3 documents (request letter, Affidavit 6,
  FDR receipt on file, latest LoA/EoA) and only active instruments; new `respondToCorrection` (owner or
  operator; attaches the corrected document and returns the case to the officer); `renewInstrument` takes
  the renewed receipt; uploaded FDR receipts get **SIMULATED** extraction (labelled, never verification).
  Evidence compares the latest receipt; older ones stay as history.
- Overview: "Needs your attention" (correction requests with the officer's message, flagged FDRs, fields
  to confirm, renewals due, open releases), deposit cover per obligation, recent activity.
- Deposit register with cover bars; instrument page with renewal lineage, evidence viewer + field
  confirmation, review status, Respond to correction, Renew, history.
- Document centre: upload (file name and size only — contents never leave the browser; "Use a sample
  file" for judges), open any document in the evidence viewer.
- Release wizard (instruments → Clause 6.46 documents → review + declaration) and request timeline
  (§7.3 stepper, what happens next, clearances, checklist, decision, hash-chained history).
- Renewals: renew from the table, renewals under review, every lineage chain.
- Fixed: a partial release no longer discharges the whole obligation (recomputes cover instead).

**Verified in the browser (fresh seed)**
- Full institution-submit flow: Owner submitted RR-2026-0028 via the wizard (sample files + LoA on file)
  → Processing Officer recorded 6.46-01…04 (each dialog pre-selected the matching document) and
  requested clearances → Clearance Officer cleared all four with references → Approver approved with the
  suggested DC/REL/2026/0028 → Owner's timeline shows Approved, the decision and every step #28–#38.
- Correction loop: officer requested correction on VC-2026-0141 → owner saw it on the overview with the
  officer's message → responded with a corrected receipt → case back to In review.
- Renewal: DMB/FD/2025/341177 renewed with a receipt → successor submitted, linked, 7 SIMULATED fields.
- Data isolation: KIT gets "not found" for another institution's instrument and release request.
- 375px: no horizontal overflow on any institution page; no console errors. `pnpm test` 30/30.

**Known gaps**
- Registering a brand-new obligation/instrument (first submission) is not in the Phase 3 scope.
- Operators cannot be granted submit permission (the brief's optional grant is not modelled).

## Phase 4 — Official Operations Portal ✅

**Done**
- New store commands, each gated by `can()`, validated by the state machines and audited:
  `assignCase` (claim / allocate), `resolveFinding`, `recordChecklistOutcome`, `markReadyForDecision`,
  `requestClearances` (completeness review → in verification → awaiting clearances; needs the four
  Clause 6.46 document items checked first).
- Case workbench `/official/cases/[id]`: document replica with evidence overlays (click a field or a region,
  confidence %, < 90% shown amber), confirm-field, discrepancy panel (declared / extracted / on record, Flag
  for review), findings (raise, resolve), checklist outcomes, request correction, mark ready, decision
  panel, case history from the audit chain.
- Release review `/official/releases/[id]`: §7.3 stepper, request + instruments, evidence, Clause 6.46
  checklist, clearances (SIMULATED), request clearances, authorised decision (reason + order/NOC reference).
- Clearance officer records outcomes from their queue and the Clearances page (assigned clearances only;
  §7.4 rules: Cleared needs a reference, other outcomes need a reason).
- Maturity radar: 90-day calendar heatmap, bands, overdue list, click a day to drill in.
- Audit explorer: re-hash the chain live; simulate tampering on any event (copy only) and show exactly
  where it breaks; event detail sheet with full hashes and payload.
- Work queue and list rows open the record; detail pages inherit their section's role gating; breadcrumbs
  show the record reference.

**Verified in the browser (fresh seed, 1440px)**
- RR-2026-0027 cross-role flow: Clearance Officer recorded PGRC (pending → cleared) and Vigilance Cell
  (further info → cleared, with only Cleared/Not cleared offered) → request and case became Ready for
  authorised decision, Clause 6.46 6/6 → Approver recorded Approve with reason and DC/REL/2026/0027 →
  request Approved, FDR Released, obligation Discharged → Institution Owner sees Approved (4/4), the
  instrument Released, the obligation Discharged and a notification → Auditor: chain intact across 30
  events; simulated tampering on #16 shows #1–15 verified, #16 broken, #17+ untrusted.
- Workbench evidence linking (table row ↔ document region ↔ field list); maturity drill-in.
- 375px: no horizontal overflow on the case workbench, release review, maturity radar.
- `pnpm test` 24/24, including the same cross-role flow at store level.

**Known gaps**
- Decision options are Approve / Reject; the brief's Return and On hold exist in the release state
  machine but have no UI yet.
- Clearances are assigned to the single demo clearance officer; supervisor allocation UI is not built.
- (Resolved in Phase 3: the institution-submit release flow now has its wizard.)

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
- Deploy to Vercel, then put the URL in the README and the SIH deck.
