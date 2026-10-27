# Replacement impact — rules, assumptions and limits

Code: `src/lib/replacement-impact.ts` (pure, deterministic) · reviews: `src/lib/reviews.ts` · commands:
`src/store/demo-store.ts` (`renewInstrument`, `amendReplacement`, `requestBankConfirmation`,
`markReadyForDecision`, `recordDecision`) · tests: `src/store/replacement.test.ts`.

Replacement impact supports an official's review. It never decides compliance or release eligibility and
no LLM is involved: amounts, dates, permissions and transitions are plain code.

## What it reports

For an original instrument and its proposed successor (a draft in the form, or a submitted record):

| Output | Meaning |
|---|---|
| Original vs successor | Instrument no., bank, amount, deposit and maturity dates |
| Continuing obligation | The obligation the original secures and its required amount (demo configuration) |
| Other accepted coverage | Other **Active** instruments on the same obligation that still cover the handover date |
| Coverage after replacement | Successor + other accepted coverage. The original is **not** counted alongside its own replacement |
| Apparent shortfall | Required − coverage after (never negative). A lower amount is not a shortfall if other accepted instruments cover the rest |
| Pending candidates | Other instruments still under review: listed, **not counted** until accepted |
| Apparent date gap | Days between the handover date and the successor's deposit date |
| Evidence findings | Successor receipt on file? Extracted fields confirmed for the current receipt version? Consistency check on the current version? Bank confirmation for the current version? |
| Non-transfer note | The original's confirmation stays with the original and is never copied |

Each finding has a level (`attention`, `insufficient`, `info`, `ok`), a plain-language reason and a next action.

Overall result:

- **Review required — apparent issues found**: any `attention` finding.
- **Insufficient information—review required**: unknown requirement, missing dates, missing receipt, or
  evidence reviews not complete on the current version.
- **No apparent issues found by these checks**: wording chosen to avoid implying approval.

## Demo date-boundary assumptions (NOT statutory rules)

No statutory rule for replacement timing has been established for this prototype. The demo uses:

- **A1.** An instrument covers its obligation from its deposit (issue) date to its maturity date, **both inclusive**, as Asia/Kolkata calendar days. An instrument without a maturity date (RTGS) covers open-endedly.
- **A2.** The successor is needed from the **handover date**: the day after the original's maturity date.
- **A3.** If the successor's deposit date is later than the handover date, every day from the handover date up to the day before the deposit is an **apparent gap**. No grace period is assumed.
- **A4.** Coverage is evaluated on the handover date. Accepted instruments that will have matured by then do not count. Draft, submitted, under-review, needs-correction or verified-not-active instruments do not count.
- **A5.** A gap is reported as *covered* (info, not attention) only if other accepted instruments meet the full requirement on the first and last gap days.

Example (the judge scenario, with the seed generated on 27 Oct 2026 — seeded dates move with "today"): original matures 08 Nov 2026 → handover 09 Nov 2026. Successor deposited
23 Nov 2026 → gap 09–22 Nov 2026 = **14 days**. Successor ₹20 L, no other accepted cover → apparent shortfall **₹5 L**.

## Evidence versions and affected reviews

- A new receipt for the same instrument is a new **evidence version** (`version`, `supersedesDocumentId`). The earlier version is kept and shown as superseded.
- Reviews (`field_confirmation`, `consistency_check`, `bank_confirmation`) are bound to one instrument and one evidence version. A new result **supersedes** the previous record (`supersededById`); nothing is deleted.
- When the receipt changes (`amendReplacement`, or a receipt upload or correction for an instrument that has reviews), the system:
  - re-runs the consistency check;
  - reopens field confirmation and bank confirmation as *pending*, with the reason;
  - resets the evidence checklist items (RE-01, RE-02) on open cases;
  - sends a *ready for decision* case back to review.
- It does **not** touch other instruments' reviews (the original's), and it does **not** revoke a recorded decision.

## Decision guard

The approver's case page captures a **decision basis**: case status and version, instrument status, version, amounts and dates (holds included), evidence versions, current reviews, clearances and findings. `recordDecision` recomputes the basis and rejects the transition if anything changed: *"This case changed after you opened it (…). Review the current state, then record the decision."*

Approval additionally re-checks, inside the command:

- no critical finding is open;
- no instrument is on hold;
- every release clearance is recorded;
- the replacement impact has no `attention` or `insufficient` finding.

Rejection remains possible on the current state.

**Limit:** all of this runs in the browser command layer of a prototype. It is a correct, tested control
model, not server-side security. In production the same checks belong in the API, under database
transactions and Row-Level Security.
