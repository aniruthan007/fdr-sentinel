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
  // Instruments — brief §7.2
  draft: { label: "Draft", tone: "neutral", hint: "Not yet submitted" },
  submitted: { label: "Submitted", tone: "info", hint: "Received, awaiting review" },
  under_review: { label: "Under review", tone: "primary", hint: "Being reviewed by an officer" },
  needs_correction: { label: "Needs correction", tone: "warning", hint: "Flagged for review; correction requested from the institution" },
  verified: { label: "Verified", tone: "success", hint: "Verified by an authorised process, never by OCR alone" },
  active: { label: "Active", tone: "success", hint: "Verified and held as security" },
  near_maturity: { label: "Near maturity", tone: "warning", hint: "Active and maturing within the reminder window" },
  matured: { label: "Matured", tone: "danger", hint: "Maturity date has passed without replacement" },
  replaced: { label: "Replaced", tone: "neutral", hint: "Superseded by a successor instrument; history kept" },
  release_requested: { label: "Release requested", tone: "primary", hint: "Included in an open release request" },
  released: { label: "Released", tone: "neutral", hint: "Release decision recorded" },
  rejected: { label: "Rejected", tone: "danger", hint: "Not accepted; see the decision record" },
  on_hold: { label: "On hold", tone: "warning", hint: "Paused by an authorised officer" },
  archived: { label: "Archived", tone: "neutral", hint: "Kept for the record; no further action" },
  // Obligations
  pending: { label: "Pending", tone: "warning", hint: "Requested or assigned; no outcome recorded yet" },
  partially_secured: { label: "Partially secured", tone: "warning", hint: "Active instruments cover part of the required amount" },
  secured: { label: "Secured", tone: "success", hint: "Active instruments cover the full amount" },
  release_in_progress: { label: "Release in progress", tone: "primary", hint: "A release request is being processed" },
  discharged: { label: "Discharged", tone: "neutral", hint: "Obligation fulfilled and closed" },
  // Cases
  open: { label: "Open", tone: "info", hint: "Not yet picked up" },
  in_review: { label: "In review", tone: "primary", hint: "An officer is working on it" },
  awaiting_institution: { label: "Awaiting institution", tone: "warning", hint: "Correction requested from the institution" },
  ready_for_decision: { label: "Ready for authorised decision", tone: "primary", hint: "All checks done. Not an approval: only the Approver records a decision" },
  approved: { label: "Approved", tone: "success", hint: "Approver recorded a positive decision with a reference" },
  closed: { label: "Closed", tone: "neutral", hint: "No further action" },
  // Release requests — brief §7.3
  completeness_review: { label: "Completeness review", tone: "primary", hint: "Checking the Clause 6.46 documents are present" },
  in_verification: { label: "In verification", tone: "primary", hint: "Documents being verified" },
  awaiting_clearances: { label: "Awaiting clearance(s)", tone: "warning", hint: "Waiting on one or more clearance outcomes" },
  awaiting_institution_response: { label: "Awaiting institution response", tone: "warning", hint: "Information requested from the institution" },
  returned: { label: "Returned", tone: "warning", hint: "Returned to the institution by the approver" },
  // Clearances — brief §7.4
  not_requested: { label: "Not requested", tone: "neutral", hint: "No clearance task created yet" },
  further_info_required: { label: "Further information required", tone: "warning", hint: "Additional evidence or clarification needed" },
  cleared: { label: "Cleared", tone: "success", hint: "Authorised person recorded a positive clearance with reference" },
  not_cleared: { label: "Not cleared", tone: "danger", hint: "Authorised person recorded a negative outcome with reason" },
  not_applicable: { label: "Not applicable", tone: "neutral", hint: "Determined not to apply; reason recorded" },
  error_unavailable: { label: "Error / unavailable", tone: "danger", hint: "Source unavailable; never treated as cleared" },
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

/** What to show for an instrument today: its stored status, or a maturity state for Active ones (brief §7.2). */
export function instrumentDisplayStatus(
  inst: Pick<FinancialInstrument, "status" | "maturityDate">,
  today: ISODate,
): InstrumentStatus | MaturityStatus {
  if (inst.status !== "active" || !inst.maturityDate) return inst.status;
  const days = daysBetween(today, inst.maturityDate);
  if (days < 0) return "matured";
  if (days <= NEAR_MATURITY_DAYS) return "near_maturity";
  return "active";
}
