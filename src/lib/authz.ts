import {
  INSTITUTION_ROLES,
  OFFICIAL_ROLES,
  type Action,
  type InstitutionRole,
  type OfficialRole,
  type Portal,
  type Role,
} from "@/types";

/**
 * Role → permitted actions. The single source of truth for the demo layer.
 * In production the same matrix is enforced in Server Actions and mirrored by Postgres RLS.
 * Brief §2.1 is the authority; open items are logged in docs/open-questions.md.
 */
const MATRIX: Record<Action, readonly Role[]> = {
  submitReleaseRequest: ["institution_owner"],
  uploadDocument: ["institution_owner", "institution_operator", "processing_officer"],
  confirmField: ["institution_owner", "institution_operator", "processing_officer"],
  raiseFinding: ["processing_officer", "supervisor"],
  requestCorrection: ["processing_officer", "supervisor"],
  recordClearance: ["clearance_officer"],
  recordDecision: ["approver"],
  renewInstrument: ["institution_owner", "institution_operator"],
  resetDemo: [...INSTITUTION_ROLES, ...OFFICIAL_ROLES],
};

/** Actions an institution user may only perform on their own institution's records. */
const INSTITUTION_SCOPED: ReadonlySet<Action> = new Set<Action>([
  "submitReleaseRequest",
  "uploadDocument",
  "confirmField",
  "renewInstrument",
]);

export interface AuthzContext {
  /** Institution the actor belongs to (institution-side users only). */
  actorInstitutionId?: string;
  /** Institution that owns the record being acted on. */
  resourceInstitutionId?: string;
}

export function isInstitutionRole(role: Role): role is InstitutionRole {
  return (INSTITUTION_ROLES as readonly Role[]).includes(role);
}

export function isOfficialRole(role: Role): role is OfficialRole {
  return (OFFICIAL_ROLES as readonly Role[]).includes(role);
}

export function portalFor(role: Role): Portal {
  return isInstitutionRole(role) ? "institution" : "official";
}

/**
 * The one permission check. Every store command calls it before touching state.
 * Institution users additionally need the record to belong to their own institution.
 */
export function can(role: Role, action: Action, ctx: AuthzContext = {}): boolean {
  if (!MATRIX[action].includes(role)) return false;
  if (isInstitutionRole(role) && INSTITUTION_SCOPED.has(action) && ctx.resourceInstitutionId) {
    return ctx.actorInstitutionId === ctx.resourceInstitutionId;
  }
  return true;
}

export function permittedActions(role: Role): Action[] {
  return (Object.keys(MATRIX) as Action[]).filter((a) => MATRIX[a].includes(role));
}

export const ROLE_LABELS: Record<Role, string> = {
  institution_owner: "Institution Owner",
  institution_operator: "Institution Operator",
  processing_officer: "Processing Officer",
  clearance_officer: "Clearance Officer",
  approver: "Approver",
  supervisor: "Supervisor",
  auditor: "Auditor",
  system_admin: "System Admin",
  policy_admin: "Policy Admin",
};
