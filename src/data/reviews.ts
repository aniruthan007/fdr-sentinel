import type { ReviewRecord } from "@/types";
import type { SeedContext } from "./context";

/**
 * Seeded review results. Only the judge-scenario original (fdr-kit-07) carries a full set, so the demo can show
 * that its bank confirmation stays with it and is never copied to a replacement.
 */
export function buildReviews(ctx: SeedContext): ReviewRecord[] {
  const base = { instrumentId: "fdr-kit-07", evidenceDocumentId: "doc-fdr-kit-07-rcpt", evidenceVersion: 1, reason: null, supersededById: null } as const;
  return [
    {
      ...base,
      id: "rv-kit07-fc",
      kind: "field_confirmation",
      status: "complete",
      source: "INSTITUTION",
      summary: "All 7 extracted fields on receipt v1 confirmed by the institution.",
      reference: null,
      recordedBy: "u-owner",
      recordedAt: ctx.t(-352, 11, 0),
      createdAt: ctx.t(-353, 15, 21),
    },
    {
      ...base,
      id: "rv-kit07-cc",
      kind: "consistency_check",
      status: "complete",
      source: "DETERMINISTIC",
      summary: "Declared instrument no., amount, deposit date and maturity date match receipt v1.",
      reference: null,
      recordedBy: "system",
      recordedAt: ctx.t(-353, 15, 21),
      createdAt: ctx.t(-353, 15, 21),
    },
    {
      ...base,
      id: "rv-kit07-bc",
      kind: "bank_confirmation",
      status: "complete",
      source: "SIMULATED",
      summary: "SIMULATED bank response confirms instrument no., ₹25,00,000.00, deposit and maturity dates and lien holder for receipt v1.",
      reference: "SIM-SUB/CNF/2025/0451",
      recordedBy: "u-po",
      recordedAt: ctx.t(-350, 12, 0),
      createdAt: ctx.t(-352, 11, 0),
    },
  ];
}
