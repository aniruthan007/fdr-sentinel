# Open questions

Anything we would otherwise have had to guess. Each has a safe, configurable default in the code.

## Open

| # | Question | Current default | Where |
|---|---|---|---|
| 2 | Handbook page references for the Clause 6.46 items, and the exact items of Annexure-1 and Annexure-2 (brief §3.1–3.4 lists evidence, not checklist wording). | Clause 6.46: six items from the brief, `provenance: "brief"`, `sourcePage: null`. Annexure-1/2: placeholder wording, `provenance: "demo_config"` | `src/data/policy.ts` |
| 3 | Required deposit amounts per obligation type. | Illustrative amounts, labelled "Demo configuration — not taken from the Approval Process Handbook" | `src/data/instruments.ts` |
| 4 | Maturity reminder and escalation windows. Brief §7.5 suggests demo horizons of 90/60/30/7 days and maturity day, as product settings. | Near-maturity badge at 30 days; escalation at 7 days | `src/data/policy.ts`, `src/lib/status.ts` |
| 5 | Which clearance outcomes satisfy Clause 6.46 item 05 vs 06. | PGRC + Vigilance Cell + Finance → 6.46-05; Approval Bureau NOC → 6.46-06. All sources SIMULATED | `src/store/demo-store.ts` (`recordClearance`) |
| 7 | Does a renewal supersede its predecessor on submission or on approval? | On approval (predecessor → Replaced); until then both exist, linked by `predecessorInstrumentId` | `src/store/demo-store.ts` (`recordDecision`) |
| 8 | Verification-case states are not enumerated in the brief (only instrument, release and clearance states are). | open · in review · awaiting institution · ready for authorised decision · approved · rejected · closed | `src/types/domain.ts` |

## Closed

| # | Question | Resolution |
|---|---|---|
| 1 | Status vocabularies and role matrix were derived without `docs/brief.md`. | Reconciled against the brief. Instrument states now match §7.2, with Near maturity / Matured derived from an Active instrument's date. Release request states match §7.3, and clearance states match §7.4 (Cleared needs a reference; other outcomes need a reason; Error / unavailable is never treated as cleared). The permission matrix follows §2.1 least privilege: Operator uploads but doesn't submit or renew; Processing Officer doesn't upload or decide; Supervisor doesn't raise findings; clearance officers record and see only clearances assigned to them; only the Approver decides; the audit log is Auditor-only. |
| 6 | May an institution operator submit a release request? | No by default (brief §2.1: "submit if permission not granted" is a must-not). Permission grants are not modelled in the demo. |
