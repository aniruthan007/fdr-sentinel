import type { ChecklistRequirement, PolicyRule } from "@/types";
import type { SeedContext } from "./context";

/**
 * Every value here is DEMO CONFIGURATION (`provenance: "demo_config"`), not a regulatory rule.
 * Clause/page references are placeholders until checked against the handbook —
 * see docs/open-questions.md. The structure (versioned, source-linked, effective-dated) is the point.
 */
const PENDING_SOURCE = "To be confirmed against the Approval Process Handbook";

export function buildPolicyRules(ctx: SeedContext): PolicyRule[] {
  const effectiveFrom = ctx.d(-200);
  return [
    {
      id: "pr-01",
      code: "REMINDER_WINDOW_DAYS",
      title: "Maturity reminder window: 30 days",
      description: "Instruments maturing within this many days are flagged Near maturity and reminders are sent.",
      sourceClause: PENDING_SOURCE,
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
    {
      id: "pr-02",
      code: "ESCALATION_WINDOW_DAYS",
      title: "Escalation window: 7 days",
      description: "Unrenewed instruments within this many days of maturity are escalated to the supervisor.",
      sourceClause: PENDING_SOURCE,
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
    {
      id: "pr-03",
      code: "RELEASE_CLEARANCE_DEPARTMENTS",
      title: "Release needs four departmental clearances",
      description: "Accounts, Approval Bureau, Grievance Cell and Vigilance must each record a clearance before a decision.",
      sourceClause: "Clause 6.46 (structure); department list is demo configuration",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
    {
      id: "pr-04",
      code: "EXTRACTION_REVIEW_THRESHOLD",
      title: "Extraction confidence below 0.90 is highlighted",
      description: "Low-confidence extracted fields are highlighted for closer human review. Extraction never verifies.",
      sourceClause: "Product rule — not regulatory",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
  ];
}

type ReqRow = [id: string, checklist: ChecklistRequirement["checklist"], code: string, label: string, appliesTo: ChecklistRequirement["appliesTo"], source: string];

/** Three separate, conditional checklists. Release uses Clause 6.46 only. */
const REQUIREMENTS: ReqRow[] = [
  ["req-a1-01", "annexure_1", "A1-01", "Instrument receipt (FDR / RPGF / RTGS)", "deposit_verification", "Annexure-1"],
  ["req-a1-02", "annexure_1", "A1-02", "Affidavit from the institution", "deposit_verification", "Annexure-1"],
  ["req-a1-03", "annexure_1", "A1-03", "Letter of Approval for the academic year", "deposit_verification", "Annexure-1"],
  ["req-a2-01", "annexure_2", "A2-01", "Receipt of the renewed instrument", "renewal", "Annexure-2"],
  ["req-a2-02", "annexure_2", "A2-02", "Bank confirmation of lien on the renewed instrument", "renewal", "Annexure-2"],
  ["req-646-01", "clause_6_46", "6.46-01", "Release application from the institution", "release", "Clause 6.46"],
  ["req-646-02", "clause_6_46", "6.46-02", "Original instrument receipt(s) to be released", "release", "Clause 6.46"],
  ["req-646-03", "clause_6_46", "6.46-03", "Accounts and Approval Bureau clearance", "release", "Clause 6.46"],
  ["req-646-04", "clause_6_46", "6.46-04", "Grievance Cell clearance", "release", "Clause 6.46"],
  ["req-646-05", "clause_6_46", "6.46-05", "Vigilance clearance", "release", "Clause 6.46"],
];

export function buildChecklistRequirements(ctx: SeedContext): ChecklistRequirement[] {
  return REQUIREMENTS.map(([id, checklist, code, label, appliesTo, source]) => ({
    id,
    checklist,
    code,
    label,
    appliesTo,
    mandatory: true,
    sourceClause: `${source} — item wording is demo configuration`,
    sourcePage: null,
    version: 1,
    effectiveFrom: ctx.d(-200),
    provenance: "demo_config",
  }));
}
