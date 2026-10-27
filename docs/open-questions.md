# Open questions

Anything we would otherwise have had to guess. Each has a safe, configurable default in the code.

## Open

| # | Question | Current default | Where |
|---|---|---|---|
| 2 | Handbook page references for the Clause 6.46 items. Annexure-1/2 are approval-process document lists (brief §3), not FDR checklists. | Clause 6.46: six items from the brief, `provenance: "brief"`, `sourcePage: null`. Deposit-lodgement and replacement-evidence checklists are labelled demo configuration and no longer cite Annexure-1/2 | `src/data/policy.ts` |
| 3 | Required deposit amounts per obligation type. | Illustrative amounts, labelled "Demo configuration — not taken from the Approval Process Handbook" | `src/data/instruments.ts` |
| 4 | Maturity reminder and escalation windows. Brief §7.5 suggests demo horizons of 90/60/30/7 days and maturity day, as product settings. | Near-maturity badge at 30 days; escalation at 7 days | `src/data/policy.ts`, `src/lib/status.ts` |
| 5 | Which cells are "applicable" for a release (brief §3.5: PGRC, Vigilance Cell and other relevant cells, as applicable)? | Demo configuration: every release gets PGRC, Vigilance Cell and an open-ended "Other applicable cells / bureaus" entry (each recordable Not applicable with a reason) → 6.46-05. Then 6.46-06: Approval Bureau NOC for FDR/RPGF and/or Council sanction order for RTGS, recordable only after the clearances. No Finance clearance is assumed. All sources SIMULATED | `src/data/releases.ts`, `recordClearance` |
| 7 | Does a renewal supersede its predecessor on submission or on approval? Is there a grace period between maturity and the successor's deposit date? | On acceptance by the Approver (predecessor → Replaced, `effectiveFrom` = successor deposit date). No grace period assumed; date assumptions A1–A7 are demo configuration | `recordDecision`, `docs/replacement-impact.md` |
| 9 | Which instrument details can a bank confirm, and through which channel? | A SIMULATED adapter confirms instrument no., amount, dates and lien holder for the current receipt version | `requestBankConfirmation` |
| 10 | Problem-statement qualifications not resolved: live AICTE portal capabilities, official reminder intervals, official decision/NOC formats, retention periods (brief §17). | Kept as open; reminder windows are configurable product settings | `docs/brief.md` §17 |
| 8 | Verification-case states are not enumerated in the brief (only instrument, release and clearance states are). | open · in review · awaiting institution · ready for authorised decision · approved · rejected · closed | `src/types/domain.ts` |

## Closed

| # | Question | Resolution |
|---|---|---|
| 1 | Status vocabularies and role matrix were derived without `docs/brief.md`. | Reconciled against the brief. Instrument states now match §7.2, with Near maturity / Matured derived from an Active instrument's date. Release request states match §7.3, and clearance states match §7.4 (Cleared needs a reference; other outcomes need a reason; Error / unavailable is never treated as cleared). The permission matrix follows §2.1 least privilege: Operator uploads but doesn't submit or renew; Processing Officer doesn't upload or decide; Supervisor doesn't raise findings; clearance officers record and see only clearances assigned to them; only the Approver decides; the audit log is Auditor-only. |
| 6 | May an institution operator submit a release request? | No by default (brief §2.1: "submit if permission not granted" is a must-not). Permission grants are not modelled in the demo. |
