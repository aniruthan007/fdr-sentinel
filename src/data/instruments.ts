import { rupees } from "@/lib/money";
import type {
  DepositObligation,
  FinancialInstrument,
  InstrumentStatus,
  InstrumentType,
  ObligationKind,
  ObligationStatus,
} from "@/types";
import type { SeedContext } from "./context";

/** Fictional banks only. IFSC prefixes are invented. */
export const BANKS = {
  DMB: { name: "Deccan Mercantile Bank", ifsc: "DMBK0", branch: "Main Branch" },
  SUB: { name: "Saraswati Union Bank", ifsc: "SUBN0", branch: "Cantonment" },
  NGB: { name: "Northgate Bank", ifsc: "NGBK0", branch: "Civil Lines" },
  CFB: { name: "Coastal Federal Bank", ifsc: "CFBL0", branch: "Harbour Road" },
  SCB: { name: "Sahyadri Commercial Bank", ifsc: "SCBK0", branch: "University Road" },
} as const;
type BankCode = keyof typeof BANKS;

export const LIEN_HOLDER = "Member Secretary, AICTE, New Delhi";
const OBLIGATION_SOURCE = "Demo configuration — amount not taken from the Approval Process Handbook";

type ObligationRow = [id: string, inst: string, kind: ObligationKind, rupees: number, status: ObligationStatus, createdOffset: number];

const OBLIGATIONS: ObligationRow[] = [
  ["ob-kit-est", "inst-kit", "establishment", 1_25_00_000, "secured", -1100],
  ["ob-kit-int", "inst-kit", "intake_increase", 25_00_000, "pending", -20],
  ["ob-kit-prog", "inst-kit", "new_programme", 15_00_000, "release_in_progress", -510],
  ["ob-wgce-est", "inst-wgce", "establishment", 1_75_00_000, "partially_secured", -330],
  ["ob-dpip-est", "inst-dpip", "establishment", 1_20_00_000, "partially_secured", -350],
  ["ob-ysm-est", "inst-ysm", "establishment", 60_00_000, "secured", -260],
  ["ob-ysm-prog", "inst-ysm", "new_programme", 30_00_000, "discharged", -910],
  ["ob-cce-est", "inst-cce", "establishment", 1_20_00_000, "secured", -340],
  ["ob-nia-est", "inst-nia", "establishment", 50_00_000, "secured", -360],
  ["ob-hit-est", "inst-hit", "establishment", 1_00_00_000, "secured", -370],
  ["ob-hit-int", "inst-hit", "intake_increase", 25_00_000, "pending", -10],
  ["ob-mce-est", "inst-mce", "establishment", 1_25_00_000, "secured", -350],
];

export function buildObligations(ctx: SeedContext): DepositObligation[] {
  return OBLIGATIONS.map(([id, institutionId, kind, amount, status, created]) => ({
    id,
    institutionId,
    kind,
    academicYear: "2026-27",
    requiredPaise: rupees(amount),
    status,
    createdAt: ctx.t(created, 10),
    sourceRef: OBLIGATION_SOURCE,
  }));
}

type InstrumentRow = [
  id: string,
  obligationId: string,
  type: InstrumentType,
  instrumentNo: string,
  bank: BankCode,
  rupees: number,
  issueOffset: number,
  /** `null` = no maturity (RTGS). */
  maturityOffset: number | null,
  status: InstrumentStatus,
  predecessor: string | null,
];

/**
 * 26 instruments. Active maturities are spread over the next ~120 days so the maturity radar
 * always has something to show. Kaveri's establishment FDR is a three-generation renewal chain.
 */
const INSTRUMENTS: InstrumentRow[] = [
  // Kaveri Institute of Technology — demo institution
  ["fdr-kit-01", "ob-kit-est", "FDR", "DMB/FD/2023/118204", "DMB", 50_00_000, -1095, -730, "replaced", null],
  ["fdr-kit-02", "ob-kit-est", "FDR", "DMB/FD/2024/220913", "DMB", 50_00_000, -730, -365, "replaced", "fdr-kit-01"],
  ["fdr-kit-03", "ob-kit-est", "FDR", "DMB/FD/2025/341177", "DMB", 50_00_000, -365, 18, "active", "fdr-kit-02"],
  ["fdr-kit-04", "ob-kit-est", "FDR", "SUB/TD/2025/0098812", "SUB", 75_00_000, -300, 64, "active", null],
  ["fdr-kit-05", "ob-kit-int", "FDR", "NGB/FDR/2026/7731045", "NGB", 25_00_000, -6, 359, "under_review", null],
  ["fdr-kit-06", "ob-kit-prog", "FDR", "DMB/FD/2024/298850", "DMB", 15_00_000, -500, 95, "release_requested", null],
  // Western Ghats College of Engineering
  ["fdr-wgce-01", "ob-wgce-est", "FDR", "CFB/FD/2026/004417", "CFB", 1_00_00_000, -9, 356, "under_review", null],
  ["fdr-wgce-02", "ob-wgce-est", "FDR", "CFB/FD/2025/003120", "CFB", 50_00_000, -320, 45, "active", null],
  ["rpgf-wgce-03", "ob-wgce-est", "RPGF", "SCB/RPGF/2025/1180", "SCB", 25_00_000, -200, 110, "active", null],
  // Deccan Plateau Institute of Pharmacy
  ["fdr-dpip-01", "ob-dpip-est", "FDR", "SCB/FD/2026/2290", "SCB", 60_00_000, -4, 361, "needs_correction", null],
  ["fdr-dpip-02", "ob-dpip-est", "FDR", "SCB/FD/2025/1907", "SCB", 40_00_000, -340, 25, "active", null],
  ["fdr-dpip-03", "ob-dpip-est", "FDR", "NGB/FDR/2025/6620981", "NGB", 20_00_000, -280, 85, "active", null],
  // Yamuna School of Management
  ["fdr-ysm-01", "ob-ysm-prog", "FDR", "NGB/FDR/2023/5100214", "NGB", 30_00_000, -900, -30, "released", null],
  ["fdr-ysm-02", "ob-ysm-est", "FDR", "NGB/FDR/2025/6001877", "NGB", 50_00_000, -250, 7, "active", null],
  ["rtgs-ysm-03", "ob-ysm-est", "RTGS", "NGBKR52025000417", "NGB", 10_00_000, -150, null, "active", null],
  // Coromandel College of Engineering
  ["fdr-cce-01", "ob-cce-est", "FDR", "DMB/FD/2025/310554", "DMB", 80_00_000, -330, 33, "active", null],
  ["fdr-cce-02", "ob-cce-est", "FDR", "DMB/FD/2025/322019", "DMB", 20_00_000, -290, 72, "active", null],
  ["fdr-cce-03", "ob-cce-est", "FDR", "CFB/FD/2025/003877", "CFB", 20_00_000, -230, 118, "active", null],
  // Narmada Institute of Architecture
  ["fdr-nia-01", "ob-nia-est", "FDR", "SUB/TD/2025/0104456", "SUB", 40_00_000, -350, 12, "active", null],
  ["fdr-nia-02", "ob-nia-est", "FDR", "SUB/TD/2025/0110093", "SUB", 10_00_000, -260, 52, "active", null],
  // Hooghly Institute of Technology
  ["fdr-hit-01", "ob-hit-est", "FDR", "NGB/FDR/2025/6334120", "NGB", 70_00_000, -360, 3, "active", null],
  ["fdr-hit-02", "ob-hit-est", "FDR", "NGB/FDR/2025/6401188", "NGB", 30_00_000, -310, 40, "active", null],
  ["fdr-hit-03", "ob-hit-int", "FDR", "SCB/FD/2026/2311", "SCB", 25_00_000, -1, 364, "submitted", null],
  // Malabar College of Engineering
  ["fdr-mce-01", "ob-mce-est", "FDR", "CFB/FD/2025/003502", "CFB", 60_00_000, -367, -2, "active", null],
  ["fdr-mce-02", "ob-mce-est", "FDR", "CFB/FD/2025/003690", "CFB", 40_00_000, -270, 58, "active", null],
  ["fdr-mce-03", "ob-mce-est", "FDR", "DMB/FD/2025/330811", "DMB", 25_00_000, -220, 101, "active", null],
];

export function buildInstruments(ctx: SeedContext): FinancialInstrument[] {
  const institutionOf = new Map(OBLIGATIONS.map(([id, inst]) => [id, inst]));
  return INSTRUMENTS.map(
    ([id, obligationId, type, instrumentNo, bank, amount, issue, maturity, status, predecessor], i) => {
      const b = BANKS[bank];
      return {
        id,
        institutionId: institutionOf.get(obligationId)!,
        obligationId,
        type,
        instrumentNo,
        bankName: b.name,
        branch: b.branch,
        ifsc: `${b.ifsc}${String(1040 + i * 37).padStart(6, "0")}`,
        amountPaise: rupees(amount),
        issueDate: ctx.d(issue),
        maturityDate: maturity === null ? null : ctx.d(maturity),
        lienHolder: LIEN_HOLDER,
        status,
        predecessorInstrumentId: predecessor,
        submittedAt: ctx.t(issue, 15, 20),
        updatedAt: ctx.t(Math.min(issue + 5, -1), 17, 45),
        version: 1,
      };
    },
  );
}
