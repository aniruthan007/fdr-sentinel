# Architecture — demo layer vs production target

Deposit Docket (formerly FDR Sentinel) is a **frontend-only prototype**. What is deployed on Vercel is the **demo layer**.
The **production target** is the design in `docs/brief.md` §5–6. Both share one domain model.

- **Demo layer (deployed).** Next.js 15 static/client rendering. Typed seed data in `src/data/`, a
  Zustand store persisted to `localStorage`, and the authorisation, state-machine and audit-chain code
  the production design would also run. No backend, no database, no real auth. Nothing leaves the browser.
- **Production target (not built).** FastAPI services in front of PostgreSQL with Row-Level Security,
  an OIDC identity provider, private object storage for documents, OCR workers fed by a job queue, a
  daily maturity-scan job, and typed adapters for bank and departmental systems. Supabase is one option
  for hosting the Postgres / auth / storage part of that target.

The point of the split: a judge can open the URL cold and use every flow with zero setup and zero chance
of a backend failing on stage, while the logic that matters — permissions, transitions, audit — is
written the way production would run it.

## Command path

```
UI component
  └─ store command (src/store/demo-store.ts)          ← production: API endpoint
       1. can(role, action, ctx)  (src/lib/authz.ts)   ← production: same check server-side + Postgres RLS
       2. structuredClone(state)                        ← production: DB transaction
       3. validate + mutate via state machines          ← production: same machines
          (src/lib/workflows.ts)
       4. seal audit event onto SHA-256 chain           ← production: append-only audit_events row
          (src/lib/audit-chain.ts)
       5. commit (set state → localStorage)             ← production: COMMIT
```

If any step fails nothing is written. Commands are serialised so every audit event chains onto the one
before it.

## Mapping

| Concern | Demo layer | Production target |
|---|---|---|
| Data store | Zustand + `localStorage` (`deposit-docket-demo`); tabs of one browser share records via `storage` events | PostgreSQL |
| Tables | One typed array per table (`src/data/seed.ts → DemoData`) | Same tables: UUID PKs, FKs, check constraints, indexes on `institution_id`, `status`, `maturity_date`, `submitted_at` |
| Identity | `/enter` role cards set a session; no password | OIDC sign-in |
| Authorisation | `can(role, action, ctx)` before every command; route gating in `PortalShell` | Same check in every endpoint, mirrored by RLS |
| Tenant isolation | `can()` compares actor vs resource `institutionId`; institution pages filter by session | RLS on every table with `institution_id` |
| State changes | Explicit commands → `assertTransition()` | Same |
| Audit | SHA-256 chain via Web Crypto, canonical JSON, `prevHash` + `hash` | `audit_events`, same columns, append-only |
| Money | Integer paise (`number`) | `numeric(14,2)` |
| Dates | `YYYY-MM-DD` for dates, UTC ISO for instants, shown in Asia/Kolkata | `date` and `timestamptz` |
| Maturity scan | Seeded `jobs` rows; maturity status derived on read | Scheduled job → notifications |
| Documents / OCR | HTML/SVG replicas with known field regions; precomputed extractions (`source: PRECOMPUTED`) | OCR workers produce extractions with confidence + bounding boxes |
| Bank / department systems | Mock adapters, every record tagged `SIMULATED` | Typed adapters behind the same interface |
| Reviews & evidence versions | `reviews` array bound to instrument + document version; superseded, never deleted | `reviews` table with FK to `documents(id)` and a partial unique index on the current review per (instrument, kind) |
| Replacement impact | Pure function `replacementImpact()` (`src/lib/replacement-impact.ts`) | Same function in the API; shown to institution and official |
| Stale-decision guard | `decisionBasis()` captured on open, recomputed inside `recordDecision` | Optimistic concurrency: version columns checked in the decision transaction |

## Demo-data lifecycle

- Seed is deterministic for a given day: every date is an offset from today in Asia/Kolkata, so
  "matures in 18 days" is always true.
- On first load, or when the stored seed is from an earlier IST day, the store regenerates the seed.
  Within a day, everything a visitor does persists across reloads and is visible across roles.
- **Reset demo** rebuilds the seed and appends a `demo.reset` event to the fresh chain.
- The persisted state is versioned; a version bump discards old data instead of migrating it.

## What the demo layer cannot prove

- Tabs of the same browser share records through `localStorage`; separate browsers or devices do not. The
  cross-role story is one browser's local state, not independent sessions on a shared server.
- The stale-decision and affected-review controls are enforced in the command layer and covered by tests, but
  they run in the browser: prototype controls, not server-side enforcement.

- Client-side `can()` is a correctness check, not a security boundary — anyone can edit `localStorage`.
  In production the boundary is the server and RLS.
- A browser-held hash chain is tamper-*evident* only against edits made without recomputing hashes.
  Production anchors the chain head server-side (periodic signed checkpoints).
