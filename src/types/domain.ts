import type { Role } from "./auth";

/** Money is integer paise (₹1 = 100 paise). Never a float rupee value. Mirrors numeric(14,2). */
export type Paise = number;
/** Calendar date, `YYYY-MM-DD`, no time zone (mirrors Postgres `date`). */
export type ISODate = string;
/** Instant in UTC, ISO-8601. Displayed in Asia/Kolkata. */
export type ISOTimestamp = string;

// ---------------------------------------------------------------------------
// Status vocabularies
// ---------------------------------------------------------------------------

/** Stored lifecycle state of an instrument. */
/**
 * Stored instrument states — brief §7.2. "Near maturity" and "Matured" (also §7.2) are derived from an
 * Active instrument's maturity date by `instrumentDisplayStatus`. Active/Verified are only ever set by an
 * explicit command, never inferred from a future maturity date or OCR success.
 */
export const INSTRUMENT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "needs_correction",
  "verified",
  "active",
  "replaced",
  "release_requested",
  "released",
  "rejected",
  "on_hold",
  "archived",
] as const;
export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];

/** Derived from an Active instrument's maturity date, never stored. */
export type MaturityStatus = "near_maturity" | "matured";

export const OBLIGATION_STATUSES = [
  "pending",
  "partially_secured",
  "secured",
  "release_in_progress",
  "discharged",
] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export const CASE_STATUSES = [
  "open",
  "in_review",
  "awaiting_institution",
  "ready_for_decision",
  "approved",
  "rejected",
  "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

/** Release request states — brief §7.3. "Ready for authorised decision" is not approval. */
export const RELEASE_STATUSES = [
  "draft",
  "submitted",
  "completeness_review",
  "in_verification",
  "awaiting_clearances",
  "awaiting_institution_response",
  "ready_for_decision",
  "approved",
  "rejected",
  "returned",
  "on_hold",
  "closed",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

/** Clearance states — brief §7.4. `error_unavailable` is never interpreted as cleared. */
export const CLEARANCE_STATUSES = [
  "not_requested",
  "pending",
  "further_info_required",
  "cleared",
  "not_cleared",
  "not_applicable",
  "error_unavailable",
] as const;
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number];

export const DOCUMENT_STATUSES = ["uploaded", "processing", "extracted", "confirmed"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const FINDING_STATUSES = ["open", "correction_requested", "resolved"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const CHECKLIST_ITEM_STATUSES = ["pending", "satisfied", "not_applicable", "failed"] as const;
export type ChecklistItemStatus = (typeof CHECKLIST_ITEM_STATUSES)[number];

export const JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ---------------------------------------------------------------------------
// Entities (one interface per table in CLAUDE.md §6)
// ---------------------------------------------------------------------------

export type InstitutionType = "Engineering" | "Management" | "Pharmacy" | "Architecture";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  /** Fictional permanent reference, e.g. `FDR-TN-0412`. */
  refCode: string;
  type: InstitutionType;
  city: string;
  state: string;
  establishedYear: number;
  contactName: string;
  contactEmail: string;
}

export type ObligationKind = "establishment" | "intake_increase" | "new_programme";

export interface DepositObligation {
  id: string;
  institutionId: string;
  kind: ObligationKind;
  academicYear: string;
  requiredPaise: Paise;
  status: ObligationStatus;
  createdAt: ISOTimestamp;
  /** Where the required amount comes from. Demo values are configuration, not regulation. */
  sourceRef: string;
}

export type InstrumentType = "FDR" | "RPGF" | "RTGS";

export interface FinancialInstrument {
  id: string;
  institutionId: string;
  obligationId: string;
  type: InstrumentType;
  instrumentNo: string;
  bankName: string;
  branch: string;
  ifsc: string;
  amountPaise: Paise;
  issueDate: ISODate;
  /** `null` for instruments with no maturity (RTGS transfers). */
  maturityDate: ISODate | null;
  lienHolder: string;
  status: InstrumentStatus;
  /** Set when this instrument renews/replaces an earlier one. History is never overwritten. */
  predecessorInstrumentId: string | null;
  submittedAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  version: number;
}

export type DocumentKind =
  | "fdr_receipt"
  | "affidavit"
  | "letter_of_approval"
  | "release_application"
  | "bank_confirmation";

export interface DocumentRecord {
  id: string;
  institutionId: string;
  instrumentId: string | null;
  caseId: string | null;
  kind: DocumentKind;
  fileName: string;
  pages: number;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: ISOTimestamp;
}

export type ExtractionField =
  | "instrument_no"
  | "amount"
  | "issue_date"
  | "maturity_date"
  | "bank_name"
  | "beneficiary"
  | "lien_holder";

/** Normalised bounding box: fractions (0–1) of page width/height. */
export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DocumentExtraction {
  id: string;
  documentId: string;
  field: ExtractionField;
  value: string;
  /** 0–1. Suggestion only — a human confirms. */
  confidence: number;
  page: number;
  bbox: BoundingBox;
  /** PRECOMPUTED for seeded documents; SIMULATED for demo uploads. */
  source: "PRECOMPUTED" | "SIMULATED";
  confirmedBy: string | null;
  confirmedAt: ISOTimestamp | null;
}

export type CaseType = "deposit_verification" | "release" | "renewal";

export interface VerificationCase {
  id: string;
  ref: string;
  type: CaseType;
  title: string;
  institutionId: string;
  instrumentIds: string[];
  releaseRequestId: string | null;
  status: CaseStatus;
  assigneeId: string | null;
  openedAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  dueDate: ISODate | null;
  /** Only an Approver records this, always with a reason and a reference number. */
  decision: CaseDecision | null;
  version: number;
}

export interface CaseDecision {
  outcome: "approved" | "rejected";
  reason: string;
  referenceNo: string;
  decidedBy: string;
  decidedAt: ISOTimestamp;
}

export type FindingType =
  | "amount_mismatch"
  | "date_mismatch"
  | "number_mismatch"
  | "name_mismatch"
  | "missing_document"
  | "other";

export type FindingSeverity = "info" | "warning" | "critical";

export interface VerificationFinding {
  id: string;
  caseId: string;
  type: FindingType;
  severity: FindingSeverity;
  field: ExtractionField | null;
  declaredValue: string | null;
  extractedValue: string | null;
  recordValue: string | null;
  description: string;
  status: FindingStatus;
  raisedBy: string;
  raisedAt: ISOTimestamp;
  resolvedAt: ISOTimestamp | null;
}

export interface ReleaseRequest {
  id: string;
  ref: string;
  institutionId: string;
  obligationId: string;
  instrumentIds: string[];
  totalPaise: Paise;
  reason: string;
  status: ReleaseStatus;
  caseId: string;
  submittedBy: string;
  submittedAt: ISOTimestamp;
  decidedAt: ISOTimestamp | null;
}

/** Clearance sources named in CLAUDE.md §6. */
export type ClearanceDepartment = "pgrc" | "vigilance_cell" | "approval_bureau" | "finance";

export interface ClearanceRecord {
  id: string;
  releaseRequestId: string;
  department: ClearanceDepartment;
  /** Every external clearance source is a mock adapter in this prototype. */
  source: "SIMULATED";
  status: ClearanceStatus;
  /** Clearance reference (required for Cleared, brief §7.4). */
  reference: string | null;
  /** Reason/remarks (required for Not cleared and Not applicable). */
  remarks: string | null;
  /** Clearance officer assigned to this clearance; only they may record its outcome (brief §2.1). */
  assignedTo: string | null;
  requestedAt: ISOTimestamp | null;
  recordedBy: string | null;
  recordedAt: ISOTimestamp | null;
}

export interface RenewalReplacement {
  id: string;
  institutionId: string;
  predecessorInstrumentId: string;
  successorInstrumentId: string;
  renewedAt: ISOTimestamp;
  recordedBy: string;
}

export interface PolicyRule {
  id: string;
  code: string;
  title: string;
  description: string;
  sourceClause: string;
  sourcePage: number | null;
  version: number;
  effectiveFrom: ISODate;
  /** `demo_config` = placeholder value pending verification against the handbook. */
  provenance: Provenance;
}

/**
 * `brief` = taken from the project brief / CLAUDE.md (handbook page not yet linked);
 * `demo_config` = placeholder value; `verified` = checked against the handbook.
 */
export type Provenance = "demo_config" | "brief" | "verified";

export type ChecklistKind = "clause_6_46" | "annexure_1" | "annexure_2";

export interface ChecklistRequirement {
  id: string;
  checklist: ChecklistKind;
  code: string;
  label: string;
  appliesTo: CaseType;
  mandatory: boolean;
  sourceClause: string;
  sourcePage: number | null;
  version: number;
  effectiveFrom: ISODate;
  provenance: Provenance;
}

export interface CaseChecklistItem {
  id: string;
  caseId: string;
  requirementId: string;
  status: ChecklistItemStatus;
  evidenceDocumentId: string | null;
  checkedBy: string | null;
  checkedAt: ISOTimestamp | null;
}

export type NotificationSeverity = "info" | "warning" | "critical" | "success";

export interface AppNotification {
  id: string;
  /** Delivered to everyone holding this role (official side) … */
  recipientRole: Role | null;
  /** … or to everyone in this institution (institution side). */
  institutionId: string | null;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string | null;
  createdAt: ISOTimestamp;
  readAt: ISOTimestamp | null;
}

export type EntityType =
  | "institution"
  | "obligation"
  | "instrument"
  | "document"
  | "extraction"
  | "case"
  | "finding"
  | "release_request"
  | "clearance"
  | "renewal"
  | "system";

export interface WorkflowEvent {
  id: string;
  entityType: EntityType;
  entityId: string;
  command: string;
  from: string | null;
  to: string;
  actorId: string;
  at: ISOTimestamp;
}

export type JobKind = "maturity_scan" | "reminder_dispatch";

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  scheduledFor: ISOTimestamp;
  startedAt: ISOTimestamp | null;
  finishedAt: ISOTimestamp | null;
  result: string | null;
}
