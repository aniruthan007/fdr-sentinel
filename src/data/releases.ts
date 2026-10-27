import { rupees } from "@/lib/money";
import type { ClearanceDepartment, ClearanceRecord, InstrumentType, ReleaseRequest, RenewalReplacement } from "@/types";
import type { SeedContext } from "./context";

export const CLEARANCE_DEPARTMENT_LABELS: Record<ClearanceDepartment, string> = {
  pgrc: "PGRC",
  vigilance_cell: "Vigilance Cell",
  other_applicable: "Other applicable cells / bureaus",
  approval_bureau: "Approval Bureau NOC (FDR/RPGF)",
  council_sanction: "Council sanction order (RTGS)",
};

/**
 * Clearance outcomes recorded first (brief §3.5: "PGRC, Vigilance Cell and other relevant cells/bureaus, as
 * applicable"). Not an exhaustive list: `other_applicable` stands for any further cell, and each entry can be recorded
 * Not applicable with a reason. Requesting all three by default on every release is DEMO CONFIGURATION.
 */
export const PRE_NOC_CLEARANCES: ClearanceDepartment[] = ["pgrc", "vigilance_cell", "other_applicable"];

/** Final records after the clearances: NOC for FDR/RPGF, Council sanction for RTGS. Kept as distinct records. */
export const FINAL_AUTHORITIES: ClearanceDepartment[] = ["approval_bureau", "council_sanction"];

export function isFinalAuthority(dept: ClearanceDepartment): boolean {
  return FINAL_AUTHORITIES.includes(dept);
}

/** Departments created for a release, in display order: clearances, then the final record(s) the instruments need. */
export function clearanceDepartmentsFor(instrumentTypes: InstrumentType[]): ClearanceDepartment[] {
  const finals: ClearanceDepartment[] = [];
  if (instrumentTypes.some((t) => t === "FDR" || t === "RPGF")) finals.push("approval_bureau");
  if (instrumentTypes.some((t) => t === "RTGS")) finals.push("council_sanction");
  return [...PRE_NOC_CLEARANCES, ...finals];
}

/** Display order for any set of clearance records. */
export const CLEARANCE_ORDER: ClearanceDepartment[] = [...PRE_NOC_CLEARANCES, ...FINAL_AUTHORITIES];

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
      status: "awaiting_clearances",
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
      status: "closed",
      caseId: "vc-06",
      submittedBy: "ext-inst-ysm",
      submittedAt: ctx.t(-70, 10, 40),
      decidedAt: ctx.t(-35, 15, 20),
    },
  ];
}

type ClearanceRow = [rr: string, dept: ClearanceDepartment, status: ClearanceRecord["status"], reference: string | null, remarks: string | null, offset: number | null];

const CLEARANCES: ClearanceRow[] = [
  ["rr-01", "pgrc", "pending", null, null, null],
  ["rr-01", "vigilance_cell", "further_info_required", null, "Copy of the programme closure order requested.", -7],
  ["rr-01", "other_applicable", "pending", null, null, null],
  ["rr-01", "approval_bureau", "pending", null, null, null],
  ["rr-02", "pgrc", "cleared", "PGRC/CLR/2026/0052", "No open grievances.", -48],
  ["rr-02", "vigilance_cell", "cleared", "VIG/CLR/2026/0040", "Nothing adverse on record.", -41],
  ["rr-02", "other_applicable", "not_applicable", null, "No other cell or bureau applies to this programme closure (determination recorded by the clearance officer).", -40],
  ["rr-02", "approval_bureau", "cleared", "AB/NOC/2026/0031", "NOC recorded after clearances: closure approved.", -38],
];

export function buildClearances(ctx: SeedContext): ClearanceRecord[] {
  return CLEARANCES.map(([releaseRequestId, department, status, reference, remarks, offset], i) => ({
    id: `clr-${String(i + 1).padStart(2, "0")}`,
    releaseRequestId,
    department,
    source: "SIMULATED",
    status,
    reference,
    remarks,
    assignedTo: "u-co",
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
      effectiveFrom: ctx.d(-730),
      caseId: null,
      recordedBy: "u-po",
    },
    {
      id: "rn-02",
      institutionId: "inst-kit",
      predecessorInstrumentId: "fdr-kit-02",
      successorInstrumentId: "fdr-kit-03",
      renewedAt: ctx.t(-360, 12, 30),
      effectiveFrom: ctx.d(-365),
      caseId: "vc-07",
      recordedBy: "u-ap",
    },
  ];
}
