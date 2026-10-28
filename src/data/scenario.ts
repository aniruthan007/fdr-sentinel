import { addDays } from "@/lib/dates";
import type { FinancialInstrument, ISODate } from "@/types";

/**
 * The repeatable judge scenario (synthetic records, explicitly defined requirements):
 *   continuing obligation ₹25 lakh (ob-kit-lab) · original FDR ₹25 lakh (fdr-kit-07, matures in 12 days)
 *   → replacement draft ₹20 lakh deposited 15 days after the original matures (apparent shortfall + 14-day gap)
 *   → permitted resolution: amend to ₹25 lakh deposited on the handover date (the day after the original matures),
 *     with a new receipt. Once accepted, the original covers through its maturity date and the successor from the next day.
 */
export const JUDGE_SCENARIO = {
  originalId: "fdr-kit-07",
  obligationId: "ob-kit-lab",
  successorNo: "SUB/TD/2026/0187420",
  draftAmountRupees: 20_00_000,
  resolvedAmountRupees: 25_00_000,
  /** Draft deposit date = original maturity + this many days (creates the apparent gap). */
  draftDepositDelayDays: 15,
} as const;

export function scenarioDraftDates(original: FinancialInstrument): { issueDate: ISODate; maturityDate: ISODate } {
  const issueDate = addDays(original.maturityDate!, JUDGE_SCENARIO.draftDepositDelayDays);
  return { issueDate, maturityDate: addDays(issueDate, 365) };
}

export function scenarioResolvedDates(original: FinancialInstrument): { issueDate: ISODate; maturityDate: ISODate } {
  const issueDate = addDays(original.maturityDate!, 1);
  return { issueDate, maturityDate: addDays(issueDate, 365) };
}
