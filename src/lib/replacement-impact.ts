import type { DemoData } from "@/data/seed";
import { addDays, daysBetween, formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { currentDocument, currentReview } from "@/lib/reviews";
import type { FinancialInstrument, ISODate, Paise } from "@/types";

/**
 * Replacement impact — deterministic, explainable checks on a proposed successor instrument.
 *
 * Nothing here decides compliance or release eligibility. It reports apparent shortfalls, apparent date gaps and
 * missing evidence, each with a plain-language reason and next action, for an official to review.
 *
 * DEMO DATE-BOUNDARY ASSUMPTIONS (documented in docs/replacement-impact.md; NOT statutory rules):
 *   A1. An instrument covers its obligation from its deposit (issue) date to its maturity date, both inclusive,
 *       as Asia/Kolkata calendar days. An instrument with no maturity date (RTGS) covers open-endedly.
 *   A2. The successor is needed from the "handover date": the day after the original's maturity date.
 *   A3. If the successor's deposit date is later than the handover date, the days in between are an apparent gap.
 *       No grace period is assumed, because none has been established for this demo.
 *   A4. Coverage after replacement = successor amount + other ACCEPTED (Active) instruments on the same obligation
 *       that still cover the handover date. The original is never counted alongside its own replacement, and
 *       pending candidates are listed but not counted until accepted.
 *   A5. A lower successor amount is not by itself a shortfall: only coverage below the obligation's required amount is.
 */

export type ImpactLevel = "ok" | "info" | "attention" | "insufficient";

export interface ImpactFinding {
  code:
    | "requirement_unknown"
    | "amount_shortfall"
    | "amount_lower_but_covered"
    | "amount_ok"
    | "pending_not_counted"
    | "dates_unknown"
    | "date_gap"
    | "date_gap_covered"
    | "dates_ok"
    | "receipt_missing"
    | "fields_unconfirmed"
    | "consistency_attention"
    | "consistency_pending"
    | "bank_confirmation_missing"
    | "bank_confirmation_attention"
    | "bank_confirmation_ok"
    | "original_confirmation_not_transferable";
  level: ImpactLevel;
  title: string;
  reason: string;
  nextAction: string | null;
}

export interface ImpactInstrument {
  id: string | null;
  instrumentNo: string;
  bankName: string;
  amountPaise: Paise;
  issueDate: ISODate | null;
  maturityDate: ISODate | null;
}

export interface ReplacementImpact {
  original: ImpactInstrument;
  successor: ImpactInstrument;
  obligationId: string;
  requiredPaise: Paise | null;
  handoverDate: ISODate | null;
  otherAccepted: ImpactInstrument[];
  otherAcceptedPaise: Paise;
  pendingNotCounted: ImpactInstrument[];
  coverageBeforePaise: Paise;
  coverageAfterPaise: Paise;
  shortfallPaise: Paise | null;
  gapDays: number | null;
  gapFrom: ISODate | null;
  gapTo: ISODate | null;
  findings: ImpactFinding[];
  overall: Exclude<ImpactLevel, "info">;
  overallLabel: string;
}

export const INSUFFICIENT_LABEL = "Insufficient information—review required";

export interface SuccessorDraft {
  instrumentNo: string;
  bankName: string;
  amountPaise: Paise;
  issueDate: ISODate | null;
  maturityDate: ISODate | null;
}

const toImpact = (i: FinancialInstrument): ImpactInstrument => ({
  id: i.id,
  instrumentNo: i.instrumentNo,
  bankName: i.bankName,
  amountPaise: i.amountPaise,
  issueDate: i.issueDate,
  maturityDate: i.maturityDate,
});

/** Statuses that make an instrument a candidate rather than accepted coverage. */
const PENDING = new Set(["draft", "submitted", "under_review", "needs_correction", "verified"]);

const covers = (i: { issueDate: ISODate | null; maturityDate: ISODate | null }, day: ISODate) =>
  !!i.issueDate && i.issueDate <= day && (i.maturityDate === null || i.maturityDate >= day);

/**
 * @param successor either the id of a submitted successor, or the values of a draft that has not been submitted.
 * @param draftHasReceipt for drafts only: whether a receipt is attached to the form.
 */
export function replacementImpact(
  d: DemoData,
  originalId: string,
  successor: { id: string } | { draft: SuccessorDraft; draftHasReceipt: boolean },
): ReplacementImpact {
  const original = d.instruments.find((i) => i.id === originalId);
  if (!original) throw new Error(`Instrument ${originalId} not found`);
  const ob = d.obligations.find((o) => o.id === original.obligationId);
  const succInst = "id" in successor ? d.instruments.find((i) => i.id === successor.id) : undefined;
  if ("id" in successor && !succInst) throw new Error(`Instrument ${successor.id} not found`);
  const succ: ImpactInstrument = succInst ? toImpact(succInst) : { id: null, ...(successor as { draft: SuccessorDraft }).draft };
  const findings: ImpactFinding[] = [];

  // --- Dates (A1–A3) --------------------------------------------------------------------------
  const handoverDate = original.maturityDate ? addDays(original.maturityDate, 1) : null;
  let gapDays: number | null = null;
  let gapFrom: ISODate | null = null;
  let gapTo: ISODate | null = null;

  // --- Other coverage (A4) --------------------------------------------------------------------
  const siblings = d.instruments.filter((i) => i.obligationId === original.obligationId && i.id !== original.id && i.id !== succ.id);
  const evalDay = handoverDate ?? succ.issueDate;
  const otherAccepted = siblings.filter((i) => i.status === "active" && (!evalDay || covers(i, evalDay))).map(toImpact);
  const otherAcceptedPaise = otherAccepted.reduce((s, i) => s + i.amountPaise, 0);
  const pendingNotCounted = siblings.filter((i) => PENDING.has(i.status)).map(toImpact);
  const required = ob && ob.requirementKnown ? ob.requiredPaise : null;
  const coverageBeforePaise = otherAcceptedPaise + original.amountPaise;
  const coverageAfterPaise = otherAcceptedPaise + succ.amountPaise;
  const shortfallPaise = required === null ? null : Math.max(0, required - coverageAfterPaise);

  // --- Amount (A4, A5) ------------------------------------------------------------------------
  if (required === null) {
    findings.push({
      code: "requirement_unknown",
      level: "insufficient",
      title: INSUFFICIENT_LABEL,
      reason: "The required amount for this obligation has not been established, so coverage cannot be compared against it.",
      nextAction: "Officer to confirm the applicable requirement before any conclusion is drawn.",
    });
  } else if (shortfallPaise! > 0) {
    findings.push({
      code: "amount_shortfall",
      level: "attention",
      title: `Apparent shortfall of ${formatINR(shortfallPaise!)}`,
      reason:
        `The continuing obligation requires ${formatINR(required)}. After replacement, accepted coverage would be ${formatINR(coverageAfterPaise)} ` +
        `(successor ${formatINR(succ.amountPaise)} + other accepted ${formatINR(otherAcceptedPaise)}). ` +
        `The original ${formatINR(original.amountPaise)} is not counted because it is the instrument being replaced.`,
      nextAction: "Institution to amend the successor amount or lodge an additional instrument; officer to review.",
    });
  } else if (succ.amountPaise < original.amountPaise) {
    findings.push({
      code: "amount_lower_but_covered",
      level: "info",
      title: "Lower successor amount, but no apparent shortfall",
      reason: `The successor is ${formatINR(original.amountPaise - succ.amountPaise)} lower than the original, but other accepted instruments (${formatINR(otherAcceptedPaise)}) keep coverage at ${formatINR(coverageAfterPaise)} against ${formatINR(required)} required.`,
      nextAction: null,
    });
  } else {
    findings.push({
      code: "amount_ok",
      level: "ok",
      title: "No apparent amount shortfall",
      reason: `Coverage after replacement ${formatINR(coverageAfterPaise)} against ${formatINR(required)} required.`,
      nextAction: null,
    });
  }
  if (pendingNotCounted.length) {
    findings.push({
      code: "pending_not_counted",
      level: "info",
      title: `${pendingNotCounted.length} other candidate instrument(s) not counted`,
      reason: `${pendingNotCounted.map((i) => `${i.instrumentNo} (${formatINR(i.amountPaise)})`).join(", ")} ${pendingNotCounted.length === 1 ? "is" : "are"} still under review and count only once accepted.`,
      nextAction: null,
    });
  }

  // --- Date gap (A2, A3) ----------------------------------------------------------------------
  if (!handoverDate || !succ.issueDate || (!succ.maturityDate && succInst?.type !== "RTGS")) {
    findings.push({
      code: "dates_unknown",
      level: "insufficient",
      title: INSUFFICIENT_LABEL,
      reason: !handoverDate
        ? "The original has no maturity date on record, so the handover date cannot be determined."
        : "The successor's deposit or maturity date is missing.",
      nextAction: "Institution to provide the missing dates with supporting evidence.",
    });
  } else {
    const gap = daysBetween(handoverDate, succ.issueDate);
    if (gap > 0) {
      gapDays = gap;
      gapFrom = handoverDate;
      gapTo = addDays(succ.issueDate, -1);
      const gapCovered = required !== null && otherAccepted.filter((i) => covers(i, gapFrom!) && covers(i, gapTo!)).reduce((s, i) => s + i.amountPaise, 0) >= required;
      findings.push(
        gapCovered
          ? {
              code: "date_gap_covered",
              level: "info",
              title: `${gap}-day gap between instruments, covered by other accepted instruments`,
              reason: `Between ${formatDate(gapFrom)} and ${formatDate(gapTo)} neither the original nor the successor is in force, but other accepted instruments meet the requirement on those days.`,
              nextAction: null,
            }
          : {
              code: "date_gap",
              level: "attention",
              title: `Apparent coverage gap of ${gap} day${gap === 1 ? "" : "s"}`,
              reason: `The original matures on ${formatDate(original.maturityDate!)}; the successor's deposit date is ${formatDate(succ.issueDate)}. From ${formatDate(gapFrom)} to ${formatDate(gapTo)} the obligation is not covered by either (demo assumption A3: no grace period).`,
              nextAction: "Institution to amend the deposit date with evidence, or explain the gap; officer to review.",
            },
      );
    } else {
      findings.push({
        code: "dates_ok",
        level: "ok",
        title: "No apparent date gap",
        reason: `The successor starts on ${formatDate(succ.issueDate)}, on or before the handover date ${formatDate(handoverDate)}.`,
        nextAction: null,
      });
    }
  }

  // --- Evidence and reviews on the successor --------------------------------------------------
  const originalBank = currentReview(d, original.id, "bank_confirmation");
  if (succInst) {
    const receipt = currentDocument(d, succInst.id);
    if (!receipt) {
      findings.push({ code: "receipt_missing", level: "insufficient", title: "No receipt on file for the successor", reason: "Nothing can be checked or confirmed without the successor's own receipt.", nextAction: "Institution to upload the successor receipt." });
    } else {
      const fc = currentReview(d, succInst.id, "field_confirmation");
      if (!fc || fc.status !== "complete" || fc.evidenceDocumentId !== receipt.id) {
        findings.push({ code: "fields_unconfirmed", level: "insufficient", title: `Extracted fields on receipt v${receipt.version} not yet confirmed`, reason: fc?.reason ?? "The successor's extracted values have not been confirmed.", nextAction: "Institution to confirm each extracted field on the instrument page." });
      }
      const cc = currentReview(d, succInst.id, "consistency_check");
      if (!cc || cc.evidenceDocumentId !== receipt.id || cc.status === "pending") {
        findings.push({ code: "consistency_pending", level: "insufficient", title: "Consistency check not run on the current receipt", reason: "Declared values have not been compared with the current receipt.", nextAction: "Re-submit or amend the successor so the check runs." });
      } else if (cc.status === "needs_attention") {
        findings.push({ code: "consistency_attention", level: "attention", title: "Declared values differ from the receipt", reason: cc.reason ?? cc.summary, nextAction: "Officer to raise a finding or request a correction." });
      }
      const bc = currentReview(d, succInst.id, "bank_confirmation");
      if (!bc || bc.status === "pending" || bc.evidenceDocumentId !== receipt.id) {
        findings.push({ code: "bank_confirmation_missing", level: "insufficient", title: "No bank confirmation for the successor", reason: bc?.reason ?? "The successor has no bank confirmation of its own.", nextAction: "Processing officer to request bank confirmation of the successor's details." });
      } else if (bc.status === "needs_attention") {
        findings.push({ code: "bank_confirmation_attention", level: "attention", title: "Bank response differs from the declaration", reason: bc.reason ?? bc.summary, nextAction: "Officer to review the bank response with the institution." });
      } else {
        findings.push({ code: "bank_confirmation_ok", level: "ok", title: `Bank confirmation recorded for receipt v${receipt.version}`, reason: `${bc.summary}${bc.reference ? ` (ref. ${bc.reference})` : ""}`, nextAction: null });
      }
    }
  } else if (!(successor as { draftHasReceipt: boolean }).draftHasReceipt) {
    findings.push({ code: "receipt_missing", level: "insufficient", title: "No receipt attached yet", reason: "Attach the successor's receipt so its fields can be extracted, confirmed and checked.", nextAction: "Attach the receipt before submitting." });
  } else {
    findings.push({ code: "bank_confirmation_missing", level: "insufficient", title: "Successor reviews start after submission", reason: "Field confirmation, the consistency check and bank confirmation all start as pending for the successor itself.", nextAction: "Submit, then confirm the extracted fields." });
  }
  findings.push({
    code: "original_confirmation_not_transferable",
    level: "info",
    title: "The original's confirmation does not carry over",
    reason: originalBank?.status === "complete"
      ? `The bank confirmation on ${original.instrumentNo}${originalBank.reference ? ` (ref. ${originalBank.reference})` : ""} covers only that instrument. It is kept in the original's history and is never copied to the successor.`
      : "Every confirmation is tied to one instrument and one evidence version; nothing is copied from the original.",
    nextAction: null,
  });

  const overall: ReplacementImpact["overall"] = findings.some((f) => f.level === "attention")
    ? "attention"
    : findings.some((f) => f.level === "insufficient")
      ? "insufficient"
      : "ok";
  const overallLabel =
    overall === "attention" ? "Review required — apparent issues found" : overall === "insufficient" ? INSUFFICIENT_LABEL : "No apparent issues found by these checks";

  return {
    original: toImpact(original),
    successor: succ,
    obligationId: original.obligationId,
    requiredPaise: required,
    handoverDate,
    otherAccepted,
    otherAcceptedPaise,
    pendingNotCounted,
    coverageBeforePaise,
    coverageAfterPaise,
    shortfallPaise,
    gapDays,
    gapFrom,
    gapTo,
    findings,
    overall,
    overallLabel,
  };
}

/** Findings that block a replacement from being marked ready for decision. */
export function blockingFindings(impact: ReplacementImpact): ImpactFinding[] {
  return impact.findings.filter((f) => f.level === "attention" || f.level === "insufficient");
}
