# FDR Sentinel

**Security Deposit & FDR Management Portal — prototype.**
Smart India Hackathon 2026 · Team Mavericks ("Not following the pack.")

> PROTOTYPE · DEMO DATA — NOT CONNECTED TO AICTE OR ANY BANK.
> Every institution, bank, person and FDR number in this app is fictional.

FDR Sentinel tracks a technical institution's security-deposit **obligations** and the **financial instruments**
(FDR / RPGF / RTGS) that secure them — from submission and document verification, through maturity and
renewal, to release — with a SHA-256 hash-chained audit trail behind every action.

## Try it

1. Open the deployed URL (or run locally, below).
2. Click **Enter the demo** → pick a role. No sign-up, no password.
3. Switch roles from the top bar at any time. **Reset demo** restores the seeded data.

| Role | Lands in | What's waiting |
|---|---|---|
| Institution Owner — Kaveri Institute of Technology | `/institution` | An amount/maturity discrepancy, an FDR maturing in 18 days, a release request awaiting clearances |
| Processing Officer | `/official` | Verification queue: mismatch, missing-document and fresh cases |
| Clearance Officer | `/official` | Two pending departmental clearances (SIMULATED sources) |
| Approver | `/official` | A clean case ready for decision |
| Auditor | `/official` | Read-only access and the full audit chain |

## Run locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test         # Vitest: store commands, authz, hash chain
pnpm build
```

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · motion ·
Zustand · TanStack Table · cmdk · Geist Sans/Mono · Vitest.

## Where things live

```
src/
  app/                 routes: / , /enter , /institution/* , /official/*
  components/          StatusBadge, MoneyText, DateText, IdText, PageHeader, EmptyState, DataTable …
    shell/             portal shell: sidebar, top bar, role switcher, theme toggle, reset
    ui/                shadcn/ui primitives
  data/                deterministic seed, every date an offset from "today" (IST)
  lib/
    authz.ts           can(role, action, ctx) — the one permission check
    workflows.ts       explicit state machines; illegal transitions throw
    audit-chain.ts     canonical JSON + SHA-256 (Web Crypto) chain, verifyChain()
    dates.ts money.ts  IST dates, integer-paise money with Indian grouping
  store/demo-store.ts  Zustand store (localStorage) — every command is authorised, validated and audited
  types/               domain types, one per table
docs/
  architecture.md      demo layer vs production design, deviations from the brief
  open-questions.md    anything we refused to guess
```

See [`docs/architecture.md`](docs/architecture.md) for how the demo layer maps onto the production design.
