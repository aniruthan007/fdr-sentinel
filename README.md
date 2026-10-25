# FDR Sentinel

**Every security deposit, tracked from submission to release.**
Security Deposit & FDR Management Portal: Smart India Hackathon 2026 · Team Mavericks ("Not following the pack.")

> **PROTOTYPE · DEMO DATA — NOT CONNECTED TO AICTE OR ANY BANK.**
> Every institution, bank, person and FDR number here is fictional. This is a proposal, not an official site.

**Live demo:** _add the Vercel URL here after the first deploy (see [Deploy](#deploy))._

Technical institutions lodge FDRs as security deposits. FDR Sentinel gives institutions and officials one
evidence-linked record of each one. The FDR is checked against its documents, watched to maturity, and
renewed without losing history. It is released only after the Clause 6.46 checklist and every clearance
are recorded, and every step is sealed in a tamper-evident SHA-256 audit chain.

---

## Two-minute demo (for judges)

No sign-up and no password. Everything runs in your browser on synthetic data. **Reset demo** (top bar)
restores the starting state at any time.

| Time | Role | Do this | You'll see |
|---|---|---|---|
| 0:00 | — | Open `/`. Hover the FDR card in the hero. | The lifecycle animation pauses; each step stamps a hash-linked audit event. |
| 0:15 | **Institution Owner** | **Launch demo** → *Institution Owner* → **Request a release** → pick *Establishment* → keep **SUB/TD/2025/0098812** only → Continue → add a reason, click **Use a sample file** twice → Continue → tick the declaration → **Submit**. | A new request (RR-2026-0028 on fresh data) at *Submitted*, with all four Clause 6.46 documents attached. |
| 0:40 | **Processing Officer** | Top bar → switch role → *Processing Officer* → **Release requests** → RR-2026-0028 → **Record** items 6.46-01 to 04 (the matching document is pre-selected) → **Request clearances**. | The stepper moves through Completeness review → In verification → Awaiting clearance(s). |
| 1:00 | | *(Optional)* **Verification cases** → VC-2026-0141 → click **Amount** in the field list. | The receipt replica highlights where the amount was read, with its confidence. The Declared / Extracted / On-record panel shows the mismatch. |
| 1:10 | **Clearance Officer** | Switch role → **Record** each clearance → *Cleared* + any reference. | After the fourth, the request becomes *Ready for authorised decision* (not an approval). |
| 1:25 | **Approver** | Switch role → open the request from your queue → **Record decision** → *Approve*, add a reason (the reference is pre-filled). | Request *Approved*, FDR *Released*. No money moves; the decision is recorded. |
| 1:40 | **Institution Owner** | Switch role → **Release requests** → RR-2026-0028. | The same request from the institution's side: decision, reference, clearances and full history. |
| 1:50 | **Auditor** | Switch role → **Audit log** → **Verify integrity**, then **Simulate tampering**. | All events re-hash to *intact*; then the edited row turns red and every event after it is *untrusted*. |

Press **⌘K / Ctrl+K** anywhere in a portal to jump to any page or record your role can open.

---

## Roles

| Role | Portal | Can | Cannot |
|---|---|---|---|
| Institution Owner (Kaveri Institute of Technology) | `/institution` | Submit release requests, upload documents, confirm extracted fields, respond to corrections, renew FDRs | See other institutions; approve anything |
| Processing Officer | `/official` | Claim cases, review evidence, raise and resolve findings, request corrections, record checklist outcomes, request clearances, mark ready | Record a decision |
| Clearance Officer | `/official` | Record outcomes of clearances assigned to them, with reference or reason | See unrelated cases |
| Approver | `/official` | Record the authorised decision with reason and order/NOC reference | Edit documents or findings |
| Auditor | `/official` | Read everything, verify the audit chain, export reports | Change any record |

The role matrix follows `docs/brief.md` §2.1. A single `can(role, action)` check gates every command and
every button. Route access mirrors it, and an institution user can never see another institution's records.

## What's inside

- **Lifecycle hero:** an FDR's whole life on the landing page, with a live hash chain beside it.
- **Evidence-linked extraction:** click a field and the document replica highlights its exact region,
  with confidence; fields under 90% are flagged amber.
- **Discrepancy panel:** declared vs extracted vs on-record values, with differences flagged for review.
- **Instrument lineage:** renewals link to the FDR they replace; history is never overwritten.
- **Clause 6.46 release workflow:** six checklist items; four departmental clearances (PGRC, Vigilance
  Cell, Finance, Approval Bureau NOC), each a separate record; authorised decision with reference.
- **Maturity radar:** 90-day calendar heatmap of maturing FDRs; click a day to drill in.
- **Tamper-evident audit chain:** every action appends a SHA-256 event linked to the previous hash; verify
  live or simulate tampering.
- **⌘K palette, dark mode, CSV export, responsive down to 375px.**

**Guardrails.** AI/OCR only suggests. It never approves, certifies authenticity, records a clearance or labels
fraud: differences are "flagged for review". There is no OCR in this prototype. Seeded documents carry
precomputed extractions, and newly uploaded receipts get extractions labelled **SIMULATED**. All bank and
department integrations are mock adapters labelled **SIMULATED**.

## Architecture

This deployment is the **demo layer**: Next.js 15 with static/client rendering, typed seed data and a
Zustand store persisted to `localStorage`. It runs the same authorisation, state machines and audit-chain
code the production design would run. The **production target** (brief §5–6) is FastAPI + PostgreSQL with
Row-Level Security, OIDC, private object storage and OCR workers. See
[`docs/architecture.md`](docs/architecture.md).

State changes are explicit commands validated by state machines that follow the brief: §7.2 instrument
states, §7.3 release states and §7.4 clearance states. No screen sets a status directly.

## Quality

| Check | Result |
|---|---|
| `pnpm test` (Vitest) | 30 tests: authz matrix and tenant isolation, every command, the full cross-role release flow, the correction loop, renewal lineage, partial release, hash-chain tamper detection |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | Clean |
| Lighthouse, desktop (`/`, `/enter`) | Performance 100 · Accessibility 100 · Best practices 100 · SEO 100 |
| Lighthouse, mobile (`/`, `/enter`) | Accessibility 100 · Best practices 100 · SEO 100 · Performance 73 / 79 (simulated throttling; observed LCP 0.4–0.6 s, CLS 0) |
| Mobile layout | 32 role × route combinations checked at 375 px: no horizontal overflow |

## Run locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test
pnpm build && pnpm start
```

## Deploy

1. On [vercel.com/new](https://vercel.com/new), import **aniruthan007/fdr-sentinel** from GitHub.
2. Keep the detected settings (Next.js, pnpm). No environment variables are needed.
3. Deploy, then put the URL at the top of this README and in the SIH deck. Every push to `main` redeploys.

## Repository map

```
src/
  app/                 / (landing) · /enter · /institution/* · /official/*
  components/
    landing/           lifecycle hero and landing sections
    institution/       wizard pieces, upload/respond/renew dialogs, lineage
    official/          evidence viewer, document replica, case panels, maturity radar, audit explorer
    shell/             portal shell, ⌘K palette, role switcher, breadcrumbs
  data/                deterministic seed — every date is an offset from "today" (IST)
  lib/                 authz (can), workflows (state machines), audit-chain (SHA-256), evidence, money, dates
  store/               Zustand demo store: every command authorised, validated and audited
docs/
  brief.md             the specification
  architecture.md      demo layer vs production target
  open-questions.md    what we refused to guess
IMPLEMENTATION_STATUS.md
```

---

Team Mavericks · Smart India Hackathon 2026
