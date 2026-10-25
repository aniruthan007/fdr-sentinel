import type { CaseChecklistItem, CaseDecision, VerificationCase, VerificationFinding } from "@/types";
import type { SeedContext } from "./context";

/** Recorded decisions on the two closed cases — reason and reference number, as CLAUDE.md §3.5 requires. */
function seededDecision(ctx: SeedContext, caseId: string): CaseDecision | null {
  if (caseId === "vc-06") {
    return { outcome: "approved", reason: "All Clause 6.46 items satisfied; all clearances recorded.", referenceNo: "DC/REL/2026/0011", decidedBy: "u-ap", decidedAt: ctx.t(-35, 15, 20) };
  }
  if (caseId === "vc-07") {
    return { outcome: "approved", reason: "Renewed FDR verified; lien confirmed by bank.", referenceNo: "DC/REN/2025/0412", decidedBy: "u-ap", decidedAt: ctx.t(-360, 12, 35) };
  }
  return null;
}

/**
 * The six required demo stories (CLAUDE.md §6):
 *   vc-02 clean · vc-03 missing document · vc-01 amount/date mismatch ·
 *   vc-05 release pending clearance · vc-07 renewal lineage · vc-06 closed/released
 * plus vc-04, a fresh unassigned case for the work queue.
 */
export function buildCases(ctx: SeedContext): VerificationCase[] {
  return buildCaseRows(ctx).map((c) => ({ ...c, decision: seededDecision(ctx, c.id) }));
}

function buildCaseRows(ctx: SeedContext): Omit<VerificationCase, "decision">[] {
  return [
    {
      id: "vc-01",
      ref: "VC-2026-0141",
      type: "deposit_verification",
      title: "Intake increase deposit — amount and maturity mismatch",
      institutionId: "inst-kit",
      instrumentIds: ["fdr-kit-05"],
      releaseRequestId: null,
      status: "in_review",
      assigneeId: "u-po",
      openedAt: ctx.t(-6, 15, 40),
      updatedAt: ctx.t(-2, 11, 15),
      dueDate: ctx.d(4),
      version: 3,
    },
    {
      id: "vc-02",
      ref: "VC-2026-0142",
      type: "deposit_verification",
      title: "Establishment deposit — new FDR",
      institutionId: "inst-wgce",
      instrumentIds: ["fdr-wgce-01"],
      releaseRequestId: null,
      status: "ready_for_decision",
      assigneeId: "u-po",
      openedAt: ctx.t(-9, 15, 45),
      updatedAt: ctx.t(-1, 16, 30),
      dueDate: ctx.d(1),
      version: 4,
    },
    {
      id: "vc-03",
      ref: "VC-2026-0139",
      type: "deposit_verification",
      title: "Establishment deposit — affidavit not provided",
      institutionId: "inst-dpip",
      instrumentIds: ["fdr-dpip-01"],
      releaseRequestId: null,
      status: "awaiting_institution",
      assigneeId: "u-po",
      openedAt: ctx.t(-4, 15, 30),
      updatedAt: ctx.t(-3, 10, 5),
      dueDate: ctx.d(3),
      version: 2,
    },
    {
      id: "vc-04",
      ref: "VC-2026-0143",
      type: "deposit_verification",
      title: "Intake increase deposit — new FDR",
      institutionId: "inst-hit",
      instrumentIds: ["fdr-hit-03"],
      releaseRequestId: null,
      status: "open",
      assigneeId: null,
      openedAt: ctx.t(-1, 15, 35),
      updatedAt: ctx.t(-1, 15, 35),
      dueDate: ctx.d(6),
      version: 1,
    },
    {
      id: "vc-05",
      ref: "VC-2026-0131",
      type: "release",
      title: "Release on discontinuation of M.Tech (Structural Engineering)",
      institutionId: "inst-kit",
      instrumentIds: ["fdr-kit-06"],
      releaseRequestId: "rr-01",
      status: "in_review",
      assigneeId: "u-po",
      openedAt: ctx.t(-12, 14, 0),
      updatedAt: ctx.t(-8, 12, 40),
      dueDate: ctx.d(9),
      version: 5,
    },
    {
      id: "vc-06",
      ref: "VC-2026-0098",
      type: "release",
      title: "Release on closure of PGDM (Evening)",
      institutionId: "inst-ysm",
      instrumentIds: ["fdr-ysm-01"],
      releaseRequestId: "rr-02",
      status: "closed",
      assigneeId: "u-po",
      openedAt: ctx.t(-70, 11, 0),
      updatedAt: ctx.t(-34, 17, 0),
      dueDate: null,
      version: 7,
    },
    {
      id: "vc-07",
      ref: "VC-2025-0412",
      type: "renewal",
      title: "Renewal of establishment FDR (third generation)",
      institutionId: "inst-kit",
      instrumentIds: ["fdr-kit-02", "fdr-kit-03"],
      releaseRequestId: null,
      status: "closed",
      assigneeId: "u-po",
      openedAt: ctx.t(-365, 15, 30),
      updatedAt: ctx.t(-360, 12, 30),
      dueDate: null,
      version: 4,
    },
  ];
}

export function buildFindings(ctx: SeedContext): VerificationFinding[] {
  return [
    {
      id: "fd-01",
      caseId: "vc-01",
      type: "amount_mismatch",
      severity: "critical",
      field: "amount",
      declaredValue: "2500000.00",
      extractedValue: "2000000.00",
      recordValue: "2500000.00",
      description: "Receipt shows ₹20,00,000.00; institution declared ₹25,00,000.00 against a ₹25,00,000.00 obligation.",
      status: "open",
      raisedBy: "u-po",
      raisedAt: ctx.t(-2, 11, 10),
      resolvedAt: null,
    },
    {
      id: "fd-02",
      caseId: "vc-01",
      type: "date_mismatch",
      severity: "warning",
      field: "maturity_date",
      declaredValue: ctx.d(359),
      extractedValue: ctx.d(329),
      recordValue: null,
      description: "Maturity date on the receipt is 30 days earlier than declared.",
      status: "open",
      raisedBy: "u-po",
      raisedAt: ctx.t(-2, 11, 12),
      resolvedAt: null,
    },
    {
      id: "fd-03",
      caseId: "vc-03",
      type: "missing_document",
      severity: "critical",
      field: null,
      declaredValue: null,
      extractedValue: null,
      recordValue: null,
      description: "Affidavit required for this obligation was not uploaded.",
      status: "correction_requested",
      raisedBy: "u-po",
      raisedAt: ctx.t(-3, 10, 0),
      resolvedAt: null,
    },
  ];
}

type ItemRow = [caseId: string, requirementId: string, status: CaseChecklistItem["status"], evidence: string | null, offset: number | null];

const ITEMS: ItemRow[] = [
  ["vc-01", "req-a1-01", "satisfied", "doc-fdr-kit-05-rcpt", -2],
  ["vc-01", "req-a1-02", "satisfied", "doc-kit-aff", -2],
  ["vc-01", "req-a1-03", "satisfied", "doc-kit-loa", -2],
  ["vc-02", "req-a1-01", "satisfied", "doc-fdr-wgce-01-rcpt", -1],
  ["vc-02", "req-a1-02", "satisfied", "doc-wgce-aff", -1],
  ["vc-02", "req-a1-03", "satisfied", "doc-wgce-loa", -1],
  ["vc-03", "req-a1-01", "satisfied", "doc-fdr-dpip-01-rcpt", -3],
  ["vc-03", "req-a1-02", "failed", null, -3],
  ["vc-03", "req-a1-03", "satisfied", "doc-dpip-loa", -3],
  ["vc-04", "req-a1-01", "pending", null, null],
  ["vc-04", "req-a1-02", "pending", null, null],
  ["vc-04", "req-a1-03", "pending", null, null],
  ["vc-05", "req-646-01", "satisfied", "doc-kit-rel", -10],
  ["vc-05", "req-646-02", "satisfied", "doc-kit-aff6-rel", -10],
  ["vc-05", "req-646-03", "satisfied", "doc-fdr-kit-06-rcpt", -10],
  ["vc-05", "req-646-04", "satisfied", "doc-kit-loa", -10],
  ["vc-05", "req-646-05", "pending", null, null],
  ["vc-05", "req-646-06", "satisfied", null, -8],
  ["vc-06", "req-646-01", "satisfied", "doc-ysm-rel", -60],
  ["vc-06", "req-646-02", "satisfied", "doc-ysm-aff6", -60],
  ["vc-06", "req-646-03", "satisfied", "doc-fdr-ysm-01-rcpt", -60],
  ["vc-06", "req-646-04", "satisfied", "doc-ysm-loa", -60],
  ["vc-06", "req-646-05", "satisfied", null, -41],
  ["vc-06", "req-646-06", "satisfied", null, -52],
  ["vc-07", "req-a2-01", "satisfied", "doc-fdr-kit-03-rcpt", -362],
  ["vc-07", "req-a2-02", "satisfied", "doc-kit-bank", -361],
];

export function buildChecklistItems(ctx: SeedContext): CaseChecklistItem[] {
  return ITEMS.map(([caseId, requirementId, status, evidence, offset], i) => ({
    id: `cci-${String(i + 1).padStart(2, "0")}`,
    caseId,
    requirementId,
    status,
    evidenceDocumentId: evidence,
    checkedBy: offset === null ? null : ["req-646-05", "req-646-06"].includes(requirementId) ? "u-co" : "u-po",
    checkedAt: offset === null ? null : ctx.t(offset, 12, 0),
  }));
}
