import { rupees } from "@/lib/money";
import type { ClearanceDepartment, ClearanceRecord, ReleaseRequest, RenewalReplacement } from "@/types";
import type { SeedContext } from "./context";

export const CLEARANCE_DEPARTMENT_LABELS: Record<ClearanceDepartment, string> = {
  accounts: "Accounts (no dues)",
  approval_bureau: "Approval Bureau",
  grievance_cell: "Grievance Cell",
  vigilance: "Vigilance",
};

export const CLEARANCE_DEPARTMENTS = Object.keys(CLEARANCE_DEPARTMENT_LABELS) as ClearanceDepartment[];

export function buildReleaseRequests(ctx: SeedContext): ReleaseRequest[] {
  return [
    {
      id: "rr-01",
      ref: "RR-2026-0027",
      institutionId: "inst-kit",
      obligationId: "ob-kit-prog",
      instrumentIds: ["fdr-kit-06"],
      totalPaise: rupees(15_00_000),
      reason: "M.Tech (Structural Engineering) discontinued from AY 2026-27; release of the programme deposit is sought.",
      status: "pending_clearance",
      caseId: "vc-05",
      submittedBy: "u-owner",
      submittedAt: ctx.t(-12, 13, 50),
      decidedAt: null,
    },
    {
      id: "rr-02",
      ref: "RR-2026-0011",
      institutionId: "inst-ysm",
      obligationId: "ob-ysm-prog",
      instrumentIds: ["fdr-ysm-01"],
      totalPaise: rupees(30_00_000),
      reason: "PGDM (Evening) programme closed with no enrolled students; release of the programme deposit is sought.",
      status: "released",
      caseId: "vc-06",
      submittedBy: "ext-inst-ysm",
      submittedAt: ctx.t(-70, 10, 40),
      decidedAt: ctx.t(-35, 15, 20),
    },
  ];
}

type ClearanceRow = [rr: string, dept: ClearanceDepartment, status: ClearanceRecord["status"], remarks: string | null, offset: number | null];

const CLEARANCES: ClearanceRow[] = [
  ["rr-01", "accounts", "cleared", "No outstanding dues on record.", -9],
  ["rr-01", "approval_bureau", "cleared", "Programme closure recorded for AY 2026-27.", -8],
  ["rr-01", "grievance_cell", "pending", null, null],
  ["rr-01", "vigilance", "pending", null, null],
  ["rr-02", "accounts", "cleared", "No outstanding dues on record.", -55],
  ["rr-02", "approval_bureau", "cleared", "Closure approved.", -52],
  ["rr-02", "grievance_cell", "cleared", "No open grievances.", -48],
  ["rr-02", "vigilance", "cleared", "Nothing adverse on record.", -41],
];

export function buildClearances(ctx: SeedContext): ClearanceRecord[] {
  return CLEARANCES.map(([releaseRequestId, department, status, remarks, offset], i) => ({
    id: `clr-${String(i + 1).padStart(2, "0")}`,
    releaseRequestId,
    department,
    source: "SIMULATED",
    status,
    remarks,
    requestedAt: releaseRequestId === "rr-01" ? ctx.t(-11, 10, 0) : ctx.t(-60, 10, 0),
    recordedBy: offset === null ? null : "u-co",
    recordedAt: offset === null ? null : ctx.t(offset, 14, 30),
  }));
}

/** Kaveri's establishment FDR: generation 1 → 2 → 3. */
export function buildRenewals(ctx: SeedContext): RenewalReplacement[] {
  return [
    {
      id: "rn-01",
      institutionId: "inst-kit",
      predecessorInstrumentId: "fdr-kit-01",
      successorInstrumentId: "fdr-kit-02",
      renewedAt: ctx.t(-730, 12, 0),
      recordedBy: "u-po",
    },
    {
      id: "rn-02",
      institutionId: "inst-kit",
      predecessorInstrumentId: "fdr-kit-02",
      successorInstrumentId: "fdr-kit-03",
      renewedAt: ctx.t(-360, 12, 30),
      recordedBy: "u-po",
    },
  ];
}
