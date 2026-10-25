import type {
  CaseStatus,
  ClearanceStatus,
  FindingStatus,
  InstrumentStatus,
  ObligationStatus,
  ReleaseStatus,
} from "@/types";

/**
 * Explicit state machines. No command may set an arbitrary status — every change goes through
 * `assertTransition`, which rejects anything not listed here.
 */
type Machine<S extends string> = Record<S, readonly S[]>;

/** Brief §7.2. Near maturity / Matured are derived from an Active instrument's date, not stored. */
export const instrumentMachine: Machine<InstrumentStatus> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected", "on_hold"],
  under_review: ["needs_correction", "verified", "rejected", "on_hold"],
  needs_correction: ["under_review", "rejected"],
  verified: ["active"],
  active: ["replaced", "release_requested", "on_hold"],
  release_requested: ["released", "active", "on_hold"],
  on_hold: ["under_review", "active"],
  replaced: ["archived"],
  released: ["archived"],
  rejected: ["archived"],
  archived: [],
};

export const caseMachine: Machine<CaseStatus> = {
  open: ["in_review", "awaiting_institution", "ready_for_decision"],
  in_review: ["awaiting_institution", "ready_for_decision"],
  awaiting_institution: ["in_review"],
  ready_for_decision: ["approved", "rejected", "in_review"],
  approved: ["closed"],
  rejected: ["closed"],
  closed: [],
};

/**
 * Brief §7.3: Draft → Submitted → Completeness review → In verification → Awaiting clearance(s) →
 * Awaiting institution response → Ready for authorised decision → Approved / Rejected / Returned / On hold → Closed.
 */
export const releaseMachine: Machine<ReleaseStatus> = {
  draft: ["submitted"],
  submitted: ["completeness_review"],
  completeness_review: ["in_verification", "awaiting_institution_response", "returned"],
  in_verification: ["awaiting_clearances", "awaiting_institution_response", "ready_for_decision"],
  awaiting_clearances: ["awaiting_institution_response", "ready_for_decision", "on_hold"],
  awaiting_institution_response: ["completeness_review", "in_verification", "awaiting_clearances"],
  ready_for_decision: ["approved", "rejected", "returned", "on_hold"],
  approved: ["closed"],
  rejected: ["closed"],
  returned: ["submitted", "closed"],
  on_hold: ["awaiting_clearances", "ready_for_decision", "closed"],
  closed: [],
};

/** Brief §7.4. Error / unavailable can only go back to Pending — it is never treated as Cleared. */
export const clearanceMachine: Machine<ClearanceStatus> = {
  not_requested: ["pending", "not_applicable"],
  pending: ["further_info_required", "cleared", "not_cleared", "not_applicable", "error_unavailable"],
  further_info_required: ["pending", "cleared", "not_cleared"],
  error_unavailable: ["pending"],
  cleared: [],
  not_cleared: [],
  not_applicable: [],
};

export const findingMachine: Machine<FindingStatus> = {
  open: ["correction_requested", "resolved"],
  correction_requested: ["resolved", "open"],
  resolved: [],
};

export const obligationMachine: Machine<ObligationStatus> = {
  pending: ["partially_secured", "secured"],
  partially_secured: ["secured"],
  secured: ["release_in_progress", "partially_secured"],
  release_in_progress: ["discharged", "secured"],
  discharged: [],
};

export class WorkflowError extends Error {
  constructor(machine: string, from: string, to: string) {
    super(`Illegal ${machine} transition: ${from} → ${to}`);
    this.name = "WorkflowError";
  }
}

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
  return machine[from].includes(to);
}

export function assertTransition<S extends string>(
  name: string,
  machine: Machine<S>,
  from: S,
  to: S,
): void {
  if (!canTransition(machine, from, to)) throw new WorkflowError(name, from, to);
}
