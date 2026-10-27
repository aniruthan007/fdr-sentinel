# Deposit Docket

**Security Deposit & FDR Management Portal**
*Every replacement linked. Every decision backed by current evidence.*

Smart India Hackathon 2026 · Team **MAVERICKS** · Team ID **SIH1277**

> **PROTOTYPE · SYNTHETIC DATA · NOT CONNECTED TO AICTE OR ANY BANK.**
> Every institution, bank, person and FDR number here is fictional. This is a proposal, not an official
> site, and it does not imply endorsement by AICTE or any bank.

**Live demo:** _add the Vercel URL here after deployment (see [Deploy](#deploy))._

Technical institutions lodge FDRs as security deposits against **continuing deposit obligations**. Deposit
Docket keeps each obligation separate from the instruments that secure it. When an FDR is replaced, the
successor is linked to its predecessor and checked for **apparent shortfalls and date gaps** against the
obligation. It needs **its own** evidence and confirmations, and an official records a decision only on the
**current** state of the case.

Deposit Docket is one application. It combines the earlier *FDR Sentinel* workflows and interface with the
*NidhiTrace* continuing-obligation, evidence-version and predecessor/successor approach. The repository
name `fdr-sentinel` is kept for continuity.

---

## Judge scenario: replacement impact (about 4 minutes)

Open `/enter` and press **Start judge scenario**, then follow the on-page **Demo guide**. The scenario uses
synthetic records with explicitly defined requirements:

| | |
|---|---|
| Continuing obligation | ₹25,00,000 additional-course deposit (Kaveri Institute of Technology), labelled demo configuration |
| Original | FDR `SUB/TD/2025/0123456`, ₹25,00,000, matures in 12 days, with its own bank confirmation (SIMULATED) |
| Replacement draft | FDR `SUB/TD/2026/0187420`, ₹20,00,000, deposited 15 days after the original matures |

1. **Institution Owner → Renew / replace → Fill scenario values.** The impact preview shows an apparent
   shortfall of ₹5,00,000 and an apparent 14-day gap, and says the original's confirmation does not carry over.
2. **Processing Officer → Verification cases → Replacement of SUB/TD/2025/0123456.** The case shows the
   *Replacement impact* panel and the successor's pending reviews. *Mark ready for decision* is refused.
3. **Institution Owner → Amend replacement → Fill resolution values.** ₹25 lakh, deposited on the original's
   maturity date, with a new receipt (v2). v1 is kept, and the affected reviews reopen. Press **Confirm all 7**.
4. **Processing Officer → Request bank confirmation (simulated)** → record RE-01 → **Mark ready for decision**.
5. **Approver → Record decision.** Only now is the original marked *Replaced*, with the effective date on the
   link. The original's confirmation history stays with the original.
6. **Institution Owner → Notifications** shows the decision.

**Restart:** **Start judge scenario** on `/enter`, or **Reset demo** in the top bar.

## Release walkthrough (about 2 minutes)

| Role | Do this | You'll see |
|---|---|---|
| **Institution Owner** | **Release requests → Request a release** → *Establishment* → keep **SUB/TD/2025/0098812** → add a reason, **Use a sample file** twice → tick the declaration → **Submit**. | A new request at *Submitted* with the Clause 6.46 documents. |
| **Processing Officer** | **Release requests** → the new request → **Record** items 6.46-01 to 04 → **Request clearances**. | Completeness review → In verification → Awaiting clearance(s). |
| **Clearance Officer** | **Record** PGRC and Vigilance Cell, then the Approval Bureau NOC. | The NOC is refused until the clearances are recorded. Then *Ready for authorised decision* (not an approval). |
| **Approver** | Open the request → **Record decision**. | *Approved*, FDR *Released*. No money moves; the decision is recorded. |
| **Auditor** | **Audit log → Verify integrity**, then **Simulate tampering**. | The edited row and everything after it fail verification. |

Press **⌘K / Ctrl+K** in a portal to jump to any page or record your role can open.

---

## What is new in Deposit Docket

- **Replacement impact** (`src/lib/replacement-impact.ts`) is deterministic arithmetic, with no LLM. It
  compares original and successor (ID, bank, amount, dates) against the continuing obligation. It counts other
  **accepted** instruments, never double-counts the original and its replacement, and lists pending candidates
  without counting them. A lower amount is not a shortfall if other accepted instruments cover the rest. Each
  finding carries a plain-language reason and next action. Unknown requirements or missing evidence read
  **"Insufficient information—review required"**, never a pass. Date assumptions:
  [`docs/replacement-impact.md`](docs/replacement-impact.md).
- **Separate verification, per evidence version** (`src/lib/reviews.ts`). Four meanings are kept apart:
  - the institution confirms an extracted field;
  - an automated consistency check completes;
  - an authorised bank source confirms specified details (SIMULATED);
  - an official records the decision.

  Each review is bound to one instrument and one receipt version, and records are superseded, never deleted.
  A successor starts with its own pending reviews, and nothing is copied from the predecessor.
- **Affected-review controls.** A new receipt version (by amendment or upload) keeps the earlier version. It
  reopens only that instrument's affected reviews, with the reason, and resets the evidence checklist items. A
  ready case goes back to review. Recorded decisions are not revoked.
- **Stale-decision guard.** The approver's screen captures a decision basis (case state, instrument details and
  holds, evidence versions, reviews, clearances, findings). `recordDecision` recomputes the basis and rejects a
  decision made on an out-of-date view. Approval also re-checks clearances, holds and replacement impact inside
  the command.
- **Acceptance, not submission, replaces.** The predecessor becomes *Replaced* only when the Approver accepts
  the successor. The link records `effectiveFrom` and the deciding case.
- **Corrected policy content.**
  - Annexure-1/2 are no longer used as generic FDR checklists; the replacement checklists are labelled demo configuration.
  - There is no universal Finance clearance.
  - PGRC and Vigilance Cell clearances come first; the Approval Bureau NOC (FDR/RPGF) or sanction order (RTGS) is a separate, later record.
  - Reminder windows are configurable product settings.
  - "Unsecured" is now *Matured without a recorded successor — review required*.

## Roles

| Role | Portal | Can | Cannot |
|---|---|---|---|
| Institution Owner (Kaveri Institute of Technology) | `/institution` | Submit releases and replacements, amend an undecided replacement, upload documents, confirm extracted fields, respond to corrections | See other institutions; approve anything |
| Processing Officer | `/official` | Review evidence and replacement impact, request (simulated) bank confirmation, raise/resolve findings, request corrections, record checklist outcomes, request clearances, mark ready | Record a decision |
| Clearance Officer | `/official` | Record clearances assigned to them, then the NOC | See unrelated cases |
| Approver | `/official` | Record the authorised decision with reason and reference, on the current state only | Edit documents or findings |
| Auditor | `/official` | Read everything, verify the audit chain, export reports | Change any record |

One `can(role, action)` check gates every command inside the store and every button. Hiding a button is a
convenience; the command refuses regardless.

## Honest limits

- **Browser-only prototype.** All state lives in this browser's `localStorage`. Tabs of the same browser share
  records, but there is no server or shared database. Permission and stale-state checks run in the browser
  command layer: they are prototype controls, **not** server-side security.
- **No live OCR.** Seeded receipts use PRECOMPUTED extractions. Uploaded receipts get SIMULATED extractions
  that echo the declared values.
- **No bank or department integration.** Bank confirmations and clearances are SIMULATED responses, labelled as such.
- **The audit chain is tamper-evident, not tamper-proof.** Someone who rewrites every later hash in the browser
  would not be detected without a server-side anchor.
- Required amounts, checklist wording and the replacement date assumptions are demo configuration, not
  statutory rules. See [`docs/open-questions.md`](docs/open-questions.md).

## Architecture

The deployment is the **demo layer**: Next.js 15 (static/client rendering), typed seed data and a Zustand
store. The **production target** (brief §5–6) is FastAPI + PostgreSQL with Row-Level Security, OIDC, private
object storage, OCR workers and bank/department adapters. See [`docs/architecture.md`](docs/architecture.md).

## Quality

| Check | Result |
|---|---|
| `pnpm test` (Vitest) | 48 tests. 30 existing: authz, commands, cross-role release, correction loop, lineage, partial release, tamper detection. 18 new: shortfall/gap arithmetic, no double counting, insufficient information, independent successor confirmation, history preserved, affected reviews, stale decisions, missing clearances, unauthorised actions, audit events |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | Clean |
| Browser walk-through (Playwright, one browser) | Full judge scenario across 4 roles; two-tab stale-decision rejection; changed pages at 375 px and 1440 px, light and dark, reduced motion: no horizontal overflow, no console errors |
| Lighthouse | Last measured in Phase 5 (before this change); not re-run |

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
  app/                 / (landing) · /enter (role entry + demo guide) · /institution/* · /official/*
  components/
    replacement/       replacement-impact view, reviews panel, stale-decision banner
    demo/              demo guide on /enter
    landing/ institution/ official/ shell/
  data/                deterministic seed (dates are offsets from "today", IST); scenario.ts; reviews.ts
  lib/                 replacement-impact, reviews (evidence versions, decision basis), authz, workflows, audit-chain
  store/               Zustand demo store: every command authorised, validated and audited; tests
docs/
  brief.md · architecture.md · replacement-impact.md · open-questions.md
```

---

Deposit Docket · Team MAVERICKS · SIH1277 · Smart India Hackathon 2026
