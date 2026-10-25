# Open questions

Anything we would otherwise have had to guess. Each has a safe, configurable default in the code.

| # | Question | Current default | Where |
|---|---|---|---|
| 1 | `docs/brief.md` is still not in the repo. Reconciled against the one-day CLAUDE.md instead: Clause 6.46 items (§3.4), clearance sources (§6), the five demo roles (§7), "ready for authorised decision ≠ approval" and decision reason + reference number (§3.5). **Still unverified against the brief:** clearance status values (brief §7.4), other status vocabularies, and the full role matrix (brief §2.1). | Statuses in `src/types/domain.ts`; matrix in `src/lib/authz.ts` | Re-check when the brief is added |
| 2 | Handbook page references for the Clause 6.46 items, and the exact items of Annexure-1 and Annexure-2. | Clause 6.46: six items from the brief, `provenance: "brief"`, `sourcePage: null`. Annexure-1/2: placeholder wording, `provenance: "demo_config"` | `src/data/policy.ts` |
| 3 | Required deposit amounts per obligation type. | Illustrative amounts, labelled "Demo configuration — not taken from the Approval Process Handbook" | `src/data/instruments.ts` |
| 4 | Maturity reminder and escalation windows. | 30 days and 7 days (`REMINDER_WINDOW_DAYS`, `ESCALATION_WINDOW_DAYS`) | `src/data/policy.ts`, `src/lib/status.ts` |
| 5 | Which clearance outcomes satisfy Clause 6.46 item 05 vs 06. | PGRC + Vigilance Cell + Finance → 6.46-05; Approval Bureau NOC → 6.46-06. All sources SIMULATED | `src/store/demo-store.ts` (`recordClearance`) |
| 6 | May an institution operator (not owner) submit a release request? | No — owner only | `src/lib/authz.ts` |
| 7 | Does a renewal supersede its predecessor on submission or on approval? | On approval; until then both exist, linked by `predecessorInstrumentId` | `src/store/demo-store.ts` (`recordDecision`) |
