# CLAUDE.md — FDR Sentinel (SIH 2026 · Team Mavericks)

Claude Code reads this file automatically at the start of every session. It is the single source of truth for this project. Re-read it before every phase.

## 1. What we are building

**FDR Sentinel** — a Security Deposit & FDR Management Portal prototype for AICTE-approved technical institutions. It is a Smart India Hackathon 2026 submission by Team Mavericks ("Not following the pack.").

The full specification is in `docs/brief.md` (the Software Architecture & AI Coding Brief). Treat it as the requirements document. This file adapts that brief to a **2-week hackathon build deployed on Vercel**.

The deployed URL goes into our SIH PPT. A judge will open it cold, with no instructions. Within 10 seconds they must understand the problem; within 60 seconds they must be inside a working demo. Every decision serves that.

## 2. Hackathon adaptations of the brief (deliberate deviations)

| Brief says | We do | Why |
|---|---|---|
| FastAPI + SQLAlchemy + Alembic backend | Next.js 15 App Router (TypeScript) with Route Handlers + Server Actions | One deployable on Vercel, no separate server to host |
| PostgreSQL | Supabase Postgres with SQL migrations in `supabase/migrations/` | Free tier, managed, Row-Level Security built in |
| OIDC provider | Supabase Auth with seeded demo accounts + one-click "Enter as role" buttons | Judges must never sign up or type a password |
| Celery / job table workers | Postgres job table + Vercel Cron for daily maturity scan | Fits serverless |
| Real OCR pipeline | Precomputed extractions for seeded documents + optional live tesseract.js in a Web Worker for uploads | Demo can never fail on stage |
| Bank / PGRC / Vigilance integrations | Typed adapters with mock implementations labelled `SIMULATED` | We do not have real access |

Record every deviation in `docs/architecture.md`.

## 3. Non-negotiable rules (from the brief)

1. Two surfaces only: **Institution Portal** (`/institution/*`) and **Official Operations Portal** (`/official/*`), plus the public showcase landing page (`/`). Official roles live inside one portal via RBAC.
2. Permissions are enforced server-side (Server Actions, Route Handlers, and Supabase RLS). Hiding a button is not access control.
3. Institution A must never see institution B's data — enforce with RLS policies on every table that has `institution_id`.
4. Deposit **obligations** are separate from **financial instruments** (FDR/RPGF/RTGS). Renewals link `predecessor_instrument_id`. Never overwrite history.
5. OCR/AI only suggests, extracts, compares and summarises — with confidence and source evidence. It never approves, verifies authenticity, clears, or labels fraud.
6. Release workflow uses the **Clause 6.46 checklist** only. Annexure-1, Annexure-2 and Clause 6.46 checklists stay separate and conditional.
7. Checklist rules are versioned, source-linked (handbook clause/page), and effective-dated. Never invent a regulatory rule; if unsure, make it configurable and log it in `docs/open-questions.md`.
8. State transitions are explicit commands validated by a state machine (`lib/workflows/*`). No endpoint sets arbitrary status.
9. Money is `numeric(14,2)`, never float. Timestamps stored UTC, displayed Asia/Kolkata. Maturity dates are `date`.
10. Every consequential action writes an `audit_events` row.
11. Never commit secrets. Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key may reach the browser. The service-role key is server-only.
12. Persistent banner in the app: **"PROTOTYPE · DEMO DATA — NOT CONNECTED TO AICTE OR ANY BANK"**. Do not use the AICTE logo, the national emblem, or any government branding. This is a proposal, not an official site.
13. All data is synthetic: fictional institutions, fictional FDR numbers, generated documents.

## 4. Tech stack

- Next.js 15 (App Router, React Server Components), TypeScript strict
- Tailwind CSS v4 + shadcn/ui (Radix primitives), lucide-react icons only
- Framer Motion (motion) for animation — purposeful, subtle
- TanStack Table for data grids, React Hook Form + Zod for forms
- Recharts only where a chart answers a real question
- Supabase: Postgres, Auth, Storage (private buckets), RLS
- `@supabase/ssr` for server/client clients
- pdf.js (react-pdf) for the document viewer with bounding-box overlays
- tesseract.js (Web Worker) for optional live OCR — Phase 3
- cmdk for the ⌘K command palette
- Vitest for unit tests, Playwright for 3–5 critical E2E flows
- Deployed on Vercel; Vercel Cron for the daily maturity job

## 5. Design direction — "premium, quiet, credible"

The wow factor comes from **craft and working depth**, not decoration. Think Linear, Stripe Dashboard, Vercel, Mercury — not a crypto landing page.

**Do**
- Neutral canvas, white surfaces, one primary colour (deep ink-blue, e.g. `#1E3A8A` family) plus semantic status colours. Full dark mode.
- Typography: Geist Sans for UI, Geist Mono for IDs/amounts/hashes. Tight, confident headings. Tabular numbers for money.
- 8px spacing grid, 1px hairline borders, soft single-layer shadows, radius 8–10px.
- Motion with meaning: state changes animate, lists stagger in once, timelines draw. 150–250ms, ease-out. Respect `prefers-reduced-motion`.
- Status badges always carry text, never colour alone.
- Every number, field and rule shows provenance on hover/click (which document, page, clause, who, when).
- Skeleton loaders, real empty states, real error states.
- Responsive down to 375px.

**Don't**
- Gradients-as-decoration, glassmorphism, glowing borders, animated blobs, emoji icons, fake charts, stock "AI brain" imagery, oversized hero padding with nothing in it.

**Signature "wow" moments (build these well — they are what judges remember)**
1. **Live lifecycle hero** on `/`: an FDR instrument card animates through its life — Submitted → OCR extracted → Mismatch flagged → Corrected → Verified → Near maturity → Renewed (lineage link) → Release requested → Clearances → Decision — each step stamping an event into an audit chain beside it.
2. **One-click role entry**: "Enter as Institution", "Processing Officer", "Approver", "Auditor" — lands in a populated portal instantly.
3. **Evidence-linked extraction**: click an extracted field (amount, FDR no., maturity date) and the PDF viewer scrolls and highlights the exact bounding box it came from, with confidence.
4. **Discrepancy panel**: declared vs extracted vs on-record values side by side, with diff highlighting.
5. **Tamper-evident audit chain**: each audit event stores `prev_hash` + `hash` (SHA-256). An "Verify integrity" button recomputes the chain live and shows a pass, plus a demo toggle that tampers a row and shows exactly where the chain breaks.
6. **Maturity radar**: a calendar heatmap of FDRs maturing in the next 90 days with drill-down.
7. **Guided tour mode**: a "Take the 2-minute tour" button that walks a judge through the full story across both portals.
8. **⌘K command palette** to jump to any institution, instrument or case.

## 6. Data model (Supabase / Postgres)

Follow section 4 of `docs/brief.md`. Tables: `institutions`, `profiles` (maps auth user), `institution_memberships`, `official_roles`, `deposit_obligations`, `financial_instruments`, `documents`, `document_extractions`, `verification_cases`, `verification_findings`, `release_requests`, `clearance_records`, `renewal_replacements`, `policy_rules`, `checklist_requirements`, `case_checklist_items`, `notifications`, `workflow_events`, `audit_events`, `jobs`.

UUID primary keys, foreign keys, check constraints, indexes on `institution_id`, `status`, `maturity_date`, `submitted_at`. `version` column for optimistic concurrency on editable cases.

## 7. Roles

Institution side: `institution_owner`, `institution_operator`.
Official side: `processing_officer`, `clearance_officer`, `approver`, `supervisor`, `auditor`, `system_admin`, `policy_admin`.
Matrix in section 2.1 of `docs/brief.md`. Implement a single `can(user, action, resource)` helper in `lib/authz/` used by every server action and route handler, mirrored by RLS.

## 8. Seed data (deterministic, `supabase/seed.sql` + `scripts/seed.ts`)

- 8 fictional institutions across Tamil Nadu, Karnataka, Maharashtra, Delhi, etc. (e.g. "Kaveri Institute of Technology", "Western Ghats College of Engineering").
- ~25 instruments with maturity dates spread across the next 120 days.
- Required demo cases: one clean case, one missing-document case, one amount/date mismatch case, one pending-clearance release request, one renewal lineage (3 generations), one closed/released case.
- Synthetic PDF documents generated by a script (FDR receipts, Affidavit 6, LoA) with known field coordinates so extractions + bounding boxes are exact.
- One demo login per role.

## 9. Roadmap (2 weeks)

| Phase | Days | Deliverable |
|---|---|---|
| 1 | 1–2 | Foundation: repo, design system, Supabase schema + RLS + seed, demo auth with role switcher, app shells for both portals, deployed to Vercel |
| 2 | 3–4 | Showcase landing page `/` with lifecycle hero, problem → solution story, architecture section, live stats from DB |
| 3 | 5–7 | Institution Portal: overview, deposit register, document centre (upload + extraction), release request wizard, request detail timeline |
| 4 | 8–10 | Official Portal: work queue, case workbench (PDF viewer + evidence overlay + discrepancy panel), release review, clearance workspace, decision recording |
| 5 | 11–12 | Maturity radar + Vercel Cron reminders, notifications centre, reports + CSV export, audit explorer with hash-chain verification, policy/checklist admin view |
| 6 | 13–14 | Guided tour, ⌘K palette, polish pass, accessibility, performance (Lighthouse ≥ 90), E2E tests, final deploy, README + demo script |

## 10. How to work

- Before coding a phase: list files to create/change and acceptance criteria. Then build.
- Small increments. After each: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` must pass.
- Never fake an integration silently. Mock adapters show a visible `SIMULATED` tag.
- Ambiguity → safe configurable default + entry in `docs/open-questions.md`.
- Keep `IMPLEMENTATION_STATUS.md` updated: done, tests run, known gaps, next step.
- At the end of each phase report: changed files, commands run, results, what I must do manually (env vars, Supabase dashboard steps, Vercel settings), and a 3–5 line plain-language explanation of what was built and why, so I can explain it to judges.
- Use pnpm. Do not add a library when the stack already covers it.
