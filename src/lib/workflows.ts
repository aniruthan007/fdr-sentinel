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

export const instrumentMachine: Machine<InstrumentStatus> = {
  submitted: ["under_verification", "rejected"],
  under_verification: ["discrepancy", "verified", "rejected"],
  discrepancy: ["under_verification", "verified", "rejected"],
  verified: ["renewed", "release_requested"],
  release_requested: ["released", "verified"],
  renewed: [],
  released: [],
  rejected: [],
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

export const releaseMachine: Machine<ReleaseStatus> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["pending_clearance", "rejected"],
  pending_clearance: ["clearances_complete", "rejected"],
  clearances_complete: ["approved", "rejected"],
  approved: ["released"],
  rejected: [],
  released: [],
};

export const clearanceMachine: Machine<ClearanceStatus> = {
  pending: ["cleared", "objection", "not_applicable"],
  objection: ["cleared"],
  cleared: [],
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
