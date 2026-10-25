# Architecture — demo layer vs production design

FDR Sentinel is built in two layers that share one domain model.

- **Demo layer (what is deployed today).** Runs entirely in the browser. Seed data, a Zustand store
  persisted to `localStorage`, and the same authorisation, state-machine and audit-chain code the
  production design uses. Nothing leaves the browser.
- **Production design (what the demo layer stands in for).** Next.js Route Handlers / Server Actions in
  front of Supabase Postgres with Row-Level Security, Supabase Auth and private Storage, Vercel Cron for
  the daily maturity scan, and typed adapters for bank and departmental systems.

The point of the split: a judge can open the URL cold and use every flow with zero setup and zero chance
of a backend failing on stage, while the code that matters — permissions, transitions, audit — is the
code production would run.

## Request path

```
UI component
  └─ store command (src/store/demo-store.ts)       ← production: Server Action
       1. can(role, action, ctx)  (src/lib/authz.ts) ← production: same function + Postgres RLS
       2. structuredClone(state)                      ← production: DB transaction
       3. validate + mutate via state machines        ← production: same machines (src/lib/workflows.ts)
          (src/lib/workflows.ts)
       4. seal audit event onto SHA-256 chain         ← production: audit_events row, same hash
          (src/lib/audit-chain.ts)
       5. commit (set state → localStorage)           ← production: COMMIT
```

If any step fails nothing is written. Commands are serialised so every audit event chains onto the one
before it.

## Mapping

| Concern | Demo layer | Production design |
|---|---|---|
| Data store | Zustand + `localStorage` (`fdr-sentinel-demo`) | Supabase Postgres, `supabase/migrations/*` |
| Tables | One typed array per table (`src/data/seed.ts → DemoData`) | Same tables, UUID PKs, FKs, check constraints, indexes on `institution_id`, `status`, `maturity_date`, `submitted_at` |
| Identity | `/enter` role cards set a session; no password | Supabase Auth with seeded demo accounts; one-click role entry |
| Authorisation | `can(role, action, ctx)` before every command; route gating in `PortalShell` | Same `can()` in every Server Action / Route Handler, mirrored by RLS policies |
| Tenant isolation | `can()` compares actor vs resource `institutionId`; institution pages filter by session | RLS: `institution_id = auth.jwt() ->> 'institution_id'` on every table that has one |
| State changes | Explicit commands → `assertTransition()` | Same |
| Audit | SHA-256 chain via Web Crypto, canonical JSON, `prevHash` + `hash` | `audit_events` with the same columns; append-only (no UPDATE/DELETE grants) |
| Money | Integer paise (`number`) | `numeric(14,2)` |
| Dates | `YYYY-MM-DD` strings for dates, UTC ISO for instants, shown in IST | `date` and `timestamptz` |
| Maturity scan | Seeded `jobs` rows; status derived on read | Vercel Cron → job table → notifications |
| OCR / extraction | Precomputed extractions with bounding boxes (`source: PRECOMPUTED`) | Same for seeded docs; optional tesseract.js in a Web Worker for uploads (Phase 3) |
| Bank / department systems | Mock adapters, every record tagged `SIMULATED` | Typed adapters behind the same interface |

## Demo-data lifecycle

- Seed is deterministic for a given day: every date is an offset from today in Asia/Kolkata, so
  "matures in 18 days" is always true.
- On first load, or when the stored seed is from an earlier IST day, the store regenerates the seed.
  Within a day, everything a visitor does persists across reloads.
- **Reset demo** rebuilds the seed and appends a `demo.reset` event to the fresh chain.
- The persisted state is versioned; a version bump discards old data instead of migrating it.

## Deliberate deviations from the brief

| Brief says | We do | Why |
|---|---|---|
| FastAPI + SQLAlchemy + Alembic | Next.js 15 App Router (Route Handlers + Server Actions) | One deployable on Vercel |
| PostgreSQL | Supabase Postgres + SQL migrations | Free tier, managed, RLS built in |
| OIDC provider | Supabase Auth, seeded accounts, one-click role entry | Judges never sign up or type a password |
| Celery / workers | Postgres job table + Vercel Cron | Fits serverless |
| Real OCR pipeline | Precomputed extractions + optional live tesseract.js | Demo can never fail on stage |
| Bank / PGRC / Vigilance integrations | Typed mock adapters labelled `SIMULATED` | No real access |
| **Phase 1 only:** server persistence | Browser-only demo store (`localStorage`) | Ships a working, deployable demo on day 1–2; Supabase schema + RLS follows behind the same interfaces |

## Things the demo layer cannot prove

Being honest about the gap:

- Client-side `can()` is a correctness check, not a security boundary — anyone can edit `localStorage`.
  In production the boundary is the server and RLS.
- A browser-held hash chain is tamper-*evident* only against edits made without recomputing hashes.
  Production anchors the chain head server-side (periodic signed checkpoints).
