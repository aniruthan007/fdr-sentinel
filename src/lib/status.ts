import type {
  CaseStatus,
  ChecklistItemStatus,
  ClearanceStatus,
  DocumentStatus,
  FinancialInstrument,
  FindingSeverity,
  FindingStatus,
  ISODate,
  InstrumentStatus,
  JobStatus,
  MaturityStatus,
  ObligationStatus,
  ReleaseStatus,
} from "@/types";
import { daysBetween } from "./dates";

export type StatusTone = "neutral" | "info" | "primary" | "warning" | "success" | "danger";

/** Every status the UI can show. Same word ⇒ same meaning across entities. */
export type AnyStatus =
  | InstrumentStatus
  | MaturityStatus
  | ObligationStatus
  | CaseStatus
  | ReleaseStatus
  | ClearanceStatus
  | DocumentStatus
  | FindingStatus
  | FindingSeverity
  | ChecklistItemStatus
  | JobStatus;

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** One-line plain-language meaning, shown on hover. */
  hint: string;
}

export const STATUS_META: Record<AnyStatus, StatusMeta> = {
  // Instruments
  submitted: { label: "Submitted", tone: "info", hint: "Received, awaiting a processing officer" },
  under_verification: { label: "Under verification", tone: "primary", hint: "An officer is checking it against documents" },
  discrepancy: { label: "Discrepancy", tone: "danger", hint: "Declared and extracted values disagree" },
  verified: { label: "Verified", tone: "success", hint: "Checked by an officer and on record" },
  near_maturity: { label: "Near maturity", tone: "warning", hint: "Matures within the reminder window" },
  matured: { label: "Matured", tone: "danger", hint: "Maturity date has passed without renewal" },
  renewed: { label: "Renewed", tone: "neutral", hint: "Superseded by a successor instrument" },
  release_requested: { label: "Release requested", tone: "primary", hint: "Included in an open release request" },
  released: { label: "Released", tone: "neutral", hint: "Lien removed and returned to the institution" },
  rejected: { label: "Rejected", tone: "danger", hint: "Not accepted; see the decision record" },
  // Obligations
  pending: { label: "Pending", tone: "warning", hint: "Awaiting action" },
  partially_secured: { label: "Partially secured", tone: "warning", hint: "Instruments cover part of the required amount" },
  secured: { label: "Secured", tone: "success", hint: "Verified instruments cover the full amount" },
  release_in_progress: { label: "Release in progress", tone: "primary", hint: "A release request is being processed" },
  discharged: { label: "Discharged", tone: "neutral", hint: "Obligation fulfilled and closed" },
  // Cases
  open: { label: "Open", tone: "info", hint: "Not yet picked up" },
  in_review: { label: "In review", tone: "primary", hint: "An officer is working on it" },
  awaiting_institution: { label: "Awaiting institution", tone: "warning", hint: "Correction requested from the institution" },
  ready_for_decision: { label: "Ready for authorised decision", tone: "primary", hint: "All checks done. Not an approval: only the Approver records a decision" },
  approved: { label: "Approved", tone: "success", hint: "Approver recorded a positive decision" },
  closed: { label: "Closed", tone: "neutral", hint: "No further action" },
  // Release requests
  draft: { label: "Draft", tone: "neutral", hint: "Not yet submitted" },
  under_review: { label: "Under review", tone: "primary", hint: "Being checked against the Clause 6.46 checklist" },
  pending_clearance: { label: "Pending clearance", tone: "warning", hint: "Waiting on one or more department clearances" },
  clearances_complete: { label: "Clearances complete", tone: "success", hint: "Every clearance recorded; ready for decision" },
  // Clearances
  cleared: { label: "Cleared", tone: "success", hint: "No dues or objections recorded" },
  objection: { label: "Objection", tone: "danger", hint: "Department recorded an objection" },
  not_applicable: { label: "Not applicable", tone: "neutral", hint: "Does not apply to this request" },
  // Documents
  uploaded: { label: "Uploaded", tone: "info", hint: "File received" },
  processing: { label: "Processing", tone: "primary", hint: "Extraction running" },
  extracted: { label: "Extracted", tone: "warning", hint: "Fields suggested; needs human confirmation" },
  confirmed: { label: "Confirmed", tone: "success", hint: "Every extracted field confirmed by a person" },
  // Findings
  correction_requested: { label: "Correction requested", tone: "warning", hint: "Sent back to the institution" },
  resolved: { label: "Resolved", tone: "success", hint: "Finding addressed" },
  info: { label: "Info", tone: "info", hint: "For the record" },
  warning: { label: "Warning", tone: "warning", hint: "Needs attention" },
  critical: { label: "Critical", tone: "danger", hint: "Blocks the case until resolved" },
  // Checklist
  satisfied: { label: "Satisfied", tone: "success", hint: "Requirement met, evidence attached" },
  failed: { label: "Failed", tone: "danger", hint: "Requirement not met" },
  // Jobs
  queued: { label: "Queued", tone: "neutral", hint: "Scheduled" },
  running: { label: "Running", tone: "primary", hint: "In progress" },
  succeeded: { label: "Succeeded", tone: "success", hint: "Completed" },
};

/** Demo configuration (policy rule `REMINDER_WINDOW_DAYS`); not a regulatory value. */
export const NEAR_MATURITY_DAYS = 30;

/** What to show for an instrument today: its stored status, or a maturity warning for verified ones. */
export function instrumentDisplayStatus(
  inst: Pick<FinancialInstrument, "status" | "maturityDate">,
  today: ISODate,
): InstrumentStatus | MaturityStatus {
  if (inst.status !== "verified" || !inst.maturityDate) return inst.status;
  const days = daysBetween(today, inst.maturityDate);
  if (days < 0) return "matured";
  if (days <= NEAR_MATURITY_DAYS) return "near_maturity";
  return "verified";
}
