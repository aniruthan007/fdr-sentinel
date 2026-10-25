# CLAUDE.md — FDR Sentinel (SIH 2026 · Team Mavericks)

Claude Code reads this file automatically. Re-read it before every phase.

## 1. What we are building — ONE-DAY BUILD

**FDR Sentinel** — a Security Deposit & FDR Management Portal prototype for AICTE-approved technical institutions. Smart India Hackathon 2026 submission by Team Mavericks ("Not following the pack.").

Full specification: `docs/brief.md`. This file cuts it down to what can be built and deployed **in one day** as a convincing, clickable demo on Vercel.

The Vercel URL goes into our SIH PPT. A judge opens it cold. In 10 seconds they understand the problem; in 60 seconds they are inside a working portal. Everything serves that.

## 2. One-day scope decisions

- **Frontend-only.** Next.js 15 App Router, TypeScript, static/client rendering. No backend, no database, no real auth.
- **Mock data** in `src/data/*.ts` — typed, deterministic, realistic.
- **Live state** in a Zustand store persisted to localStorage, so actions in one role (institution submits a release request) show up in another role (officer queue). A "Reset demo" button restores seed data.
- **Role entry** without login: `/enter` has one-click cards per role.
- **Documents** are rendered as HTML/SVG replicas (FDR receipt, Affidavit 6, LoA) with known field coordinates, so "extracted field → highlight on document" works perfectly. No real OCR.
- **Audit chain** hashed in the browser with Web Crypto SHA-256.
- Explain in `docs/architecture.md` that the production design (brief §5–6: FastAPI/Postgres/RLS/OCR workers) is the target and this is the demo layer.

## 3. Non-negotiable rules

1. Two portals: **Institution Portal** `/institution/*` and **Official Operations Portal** `/official/*`, plus landing `/` and `/enter`. Official roles share one portal; navigation and actions change by role.
2. Obligations are separate from instruments (FDR/RPGF/RTGS). Renewals link to a predecessor. History is never overwritten.
3. AI/OCR only suggests and flags — with confidence and source. It never approves, verifies authenticity, clears, or labels fraud. Copy must say "flagged for review", never "fraud detected".
4. Release checklist = Clause 6.46 only (request letter, Affidavit 6, FDR/payment copy, latest LoA/EoA, PGRC/Vigilance/other clearances, Approval Bureau NOC or RTGS sanction order).
5. "Ready for authorised decision" is not approval. Only the Approver role can record a decision, with reason + reference number.
6. Every action appends an audit event.
7. Money: ₹ with Indian grouping (₹12,50,000). Dates in Asia/Kolkata, DD MMM YYYY.
8. Persistent thin banner: **"PROTOTYPE · DEMO DATA — NOT CONNECTED TO AICTE OR ANY BANK"**. No AICTE logo, no national emblem, no government branding.
9. All data fictional.

## 4. Stack

Next.js 15 · TypeScript strict · pnpm · Tailwind v4 · shadcn/ui · lucide-react · motion (Framer Motion) · Zustand · TanStack Table · Recharts (only for real questions) · cmdk · Geist Sans + Geist Mono. Deploy: Vercel.

## 5. Design — "premium, quiet, credible"

Wow comes from craft and working depth. Reference feel: Linear, Stripe Dashboard, Vercel, Mercury.

**Do:** neutral canvas, white surfaces, one primary (deep ink-blue, `#1E3A8A` family), semantic status colours, full dark mode. Geist Sans for UI, Geist Mono for IDs/amounts/hashes, tabular numbers. 8px grid, 1px hairline borders, soft single shadows, radius 8–10px. Motion with meaning (150–250ms ease-out, respects reduced motion). Status badges always carry text. Provenance on hover (document, page, clause, who, when). Skeletons, empty states. Works at 375px.

**Don't:** decorative gradients, glassmorphism, glow, blobs, emoji icons, fake charts, stock AI imagery, empty oversized hero.

**Signature moments (build these well):**
1. **Lifecycle hero** on `/`: an FDR card animates through Submitted → Extracted → Mismatch flagged → Corrected → Verified → Near maturity → Renewed → Release requested → Clearances → Decision, each step stamping a hashed event into an audit chain beside it. Loops.
2. **One-click role entry** at `/enter`.
3. **Evidence-linked extraction**: click an extracted field and the document replica highlights its exact region, with confidence %.
4. **Discrepancy panel**: Declared vs Extracted vs On record, mismatches highlighted.
5. **Tamper-evident audit chain**: "Verify integrity" recomputes all hashes live → pass. "Simulate tampering" edits one row → the chain breaks exactly at that row, shown in red.
6. **Maturity radar**: 90-day calendar heatmap of maturing FDRs, click a day to drill in.
7. **⌘K palette** to jump to any institution, instrument or case.

## 6. Mock data (`src/data/`)

- 8 fictional institutions across states (e.g. Kaveri Institute of Technology — Tamil Nadu; Western Ghats College of Engineering — Karnataka; Deccan Institute of Management — Maharashtra).
- ~25 instruments: FDR/RPGF/RTGS, banks (SBI, Canara Bank, Indian Bank, etc.), amounts ₹5L–₹1.5Cr, maturity dates spread over the next 120 days from today.
- Demo cases that must exist: clean case · missing-document case · amount/date mismatch case · release request pending clearances · 3-generation renewal lineage · released & closed case.
- Documents with extracted fields: `{field, value, confidence, region:{x,y,w,h}}`.
- Clearances: PGRC, Vigilance Cell, Approval Bureau, Finance — with statuses from brief §7.4.
- ~40 seeded audit events forming a valid hash chain.

## 7. Roles

Institution Owner · Processing Officer · Clearance Officer · Approver · Auditor. A `can(role, action)` helper in `src/lib/authz.ts` gates every action button AND the store action itself.

## 8. Phases (one day)

| # | Time | Deliverable |
|---|---|---|
| 1 | ~2.5h | Scaffold, design system, mock data + store, `/enter`, both portal shells, deployed |
| 2 | ~2h | Landing page `/` with lifecycle hero and story |
| 3 | ~2.5h | Institution Portal: overview, deposit register + lineage, document centre, release wizard, request timeline |
| 4 | ~3h | Official Portal: work queue, case workbench (evidence + discrepancies), release review + clearances + decision, maturity radar, audit explorer with integrity check |
| 5 | ~1h | ⌘K, polish, mobile check, Lighthouse, final deploy, README |

## 9. How to work

- Move fast. Start building immediately after a short plan. Don't ask questions unless blocked.
- After each phase: `pnpm build` must pass, then commit and push (Vercel auto-deploys).
- End each phase with: changed files, what I must do manually, and a 3–5 line plain-language explanation of what was built and why, so I can explain it to judges.
