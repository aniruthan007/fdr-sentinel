# Open questions

Anything we would otherwise have had to guess. Each has a safe, configurable default in the code.

| # | Question | Current default | Where |
|---|---|---|---|
| 1 | `docs/brief.md` was not in the repo at Phase 1. Status vocabularies (brief §7) and the role/permission matrix (brief §2.1) were derived from CLAUDE.md. | Statuses in `src/types/domain.ts`; matrix in `src/lib/authz.ts` | Reconcile when the brief is added |
| 2 | Exact items of the Clause 6.46 release checklist, Annexure-1 and Annexure-2, with handbook page numbers. | Placeholder wording, `provenance: "demo_config"`, `sourcePage: null` | `src/data/policy.ts` |
| 3 | Required deposit amounts per obligation type. | Illustrative amounts, labelled "Demo configuration — not taken from the Approval Process Handbook" | `src/data/instruments.ts` |
| 4 | Maturity reminder and escalation windows. | 30 days and 7 days (`REMINDER_WINDOW_DAYS`, `ESCALATION_WINDOW_DAYS`) | `src/data/policy.ts`, `src/lib/status.ts` |
| 5 | Which departments must clear a release. | Accounts, Approval Bureau, Grievance Cell, Vigilance — all SIMULATED | `src/data/releases.ts` |
| 6 | May an institution operator (not owner) submit a release request? | No — owner only | `src/lib/authz.ts` |
| 7 | Does a renewal supersede its predecessor on submission or on approval? | On approval; until then both exist, linked by `predecessorInstrumentId` | `src/store/demo-store.ts` (`recordDecision`) |
