import { sealChain } from "@/lib/audit-chain";
import type {
  AppNotification,
  AuditEvent,
  CaseChecklistItem,
  ChecklistRequirement,
  ClearanceRecord,
  DepositObligation,
  DocumentExtraction,
  DocumentRecord,
  FinancialInstrument,
  ISODate,
  Institution,
  Job,
  PolicyRule,
  ReleaseRequest,
  RenewalReplacement,
  ReviewRecord,
  VerificationCase,
  VerificationFinding,
  WorkflowEvent,
} from "@/types";
import { buildAuditDrafts, buildJobs, buildNotifications, buildWorkflowEvents } from "./activity";
import { buildCases, buildChecklistItems, buildFindings } from "./cases";
import { seedContext } from "./context";
import { buildDocuments, buildExtractions } from "./documents";
import { INSTITUTIONS } from "./institutions";
import { buildInstruments, buildObligations } from "./instruments";
import { buildChecklistRequirements, buildPolicyRules } from "./policy";
import { buildClearances, buildReleaseRequests, buildRenewals } from "./releases";
import { buildReviews } from "./reviews";

/** All demo records. One array per table in CLAUDE.md §6. */
export interface DemoData {
  /** IST date the seed was generated for; dates are offsets from it. */
  seedDay: ISODate;
  institutions: Institution[];
  obligations: DepositObligation[];
  instruments: FinancialInstrument[];
  documents: DocumentRecord[];
  extractions: DocumentExtraction[];
  cases: VerificationCase[];
  findings: VerificationFinding[];
  releaseRequests: ReleaseRequest[];
  clearances: ClearanceRecord[];
  renewals: RenewalReplacement[];
  /** Field confirmations, consistency checks and bank confirmations — per instrument and evidence version. */
  reviews: ReviewRecord[];
  policyRules: PolicyRule[];
  checklistRequirements: ChecklistRequirement[];
  checklistItems: CaseChecklistItem[];
  notifications: AppNotification[];
  workflowEvents: WorkflowEvent[];
  jobs: Job[];
  audit: AuditEvent[];
}

/** Deterministic for a given day. The audit chain is sealed with Web Crypto, hence async. */
export async function buildSeed(today: ISODate): Promise<DemoData> {
  const ctx = seedContext(today);
  const institutions = structuredClone(INSTITUTIONS);
  const instruments = buildInstruments(ctx);
  return {
    seedDay: today,
    institutions,
    obligations: buildObligations(ctx),
    instruments,
    documents: buildDocuments(ctx, instruments),
    extractions: buildExtractions(ctx, instruments, institutions),
    cases: buildCases(ctx),
    findings: buildFindings(ctx),
    releaseRequests: buildReleaseRequests(ctx),
    clearances: buildClearances(ctx),
    renewals: buildRenewals(ctx),
    reviews: buildReviews(ctx),
    policyRules: buildPolicyRules(ctx),
    checklistRequirements: buildChecklistRequirements(ctx),
    checklistItems: buildChecklistItems(ctx),
    notifications: buildNotifications(ctx),
    workflowEvents: buildWorkflowEvents(ctx),
    jobs: buildJobs(ctx),
    audit: await sealChain(buildAuditDrafts(ctx, institutions)),
  };
}
