export const INSTITUTION_ROLES = ["institution_owner", "institution_operator"] as const;

export const OFFICIAL_ROLES = [
  "processing_officer",
  "clearance_officer",
  "approver",
  "supervisor",
  "auditor",
  "system_admin",
  "policy_admin",
] as const;

export type InstitutionRole = (typeof INSTITUTION_ROLES)[number];
export type OfficialRole = (typeof OFFICIAL_ROLES)[number];
export type Role = InstitutionRole | OfficialRole;

export type Portal = "institution" | "official";

/** A seeded demo identity. One per role that the /enter page offers. */
export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  title: string;
  /** Set only for institution-side users. */
  institutionId?: string;
  email: string;
}

export interface Session {
  userId: string;
  name: string;
  role: Role;
  institutionId?: string;
}

/** Every store command that changes state. `can(role, action)` gates each one. */
export type Action =
  | "submitReleaseRequest"
  | "uploadDocument"
  | "confirmField"
  | "raiseFinding"
  | "requestCorrection"
  | "recordClearance"
  | "recordDecision"
  | "renewInstrument"
  | "assignCase"
  | "resolveFinding"
  | "recordChecklistOutcome"
  | "markReadyForDecision"
  | "requestClearances"
  | "respondToCorrection"
  | "resetDemo";
