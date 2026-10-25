import type { ChecklistRequirement, PolicyRule } from "@/types";
import type { SeedContext } from "./context";

/**
 * Provenance is explicit on every row:
 *   `brief`       — taken from the project brief (CLAUDE.md §3.4 for Clause 6.46); handbook page not yet linked.
 *   `demo_config` — placeholder value, not a regulatory rule. See docs/open-questions.md.
 * The structure (versioned, source-linked, effective-dated) is the point.
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
      title: "Release needs PGRC, Vigilance Cell, Approval Bureau and Finance clearances",
      description: "Each clearance source records an outcome before the case is ready for an authorised decision.",
      sourceClause: "Clause 6.46 (per project brief); handbook page not yet linked",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "brief",
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

type ReqRow = [id: string, checklist: ChecklistRequirement["checklist"], code: string, label: string, appliesTo: ChecklistRequirement["appliesTo"], source: string, provenance: ChecklistRequirement["provenance"]];

/** Three separate, conditional checklists. Release uses Clause 6.46 only. */
const REQUIREMENTS: ReqRow[] = [
  ["req-a1-01", "annexure_1", "A1-01", "Instrument receipt (FDR / RPGF / RTGS)", "deposit_verification", "Annexure-1", "demo_config"],
  ["req-a1-02", "annexure_1", "A1-02", "Affidavit 6 from the institution", "deposit_verification", "Annexure-1", "demo_config"],
  ["req-a1-03", "annexure_1", "A1-03", "Latest LoA / EoA", "deposit_verification", "Annexure-1", "demo_config"],
  ["req-a2-01", "annexure_2", "A2-01", "Receipt of the renewed instrument", "renewal", "Annexure-2", "demo_config"],
  ["req-a2-02", "annexure_2", "A2-02", "Bank confirmation of lien on the renewed instrument", "renewal", "Annexure-2", "demo_config"],
  // Clause 6.46: the six items listed in the brief (CLAUDE.md §3.4).
  ["req-646-01", "clause_6_46", "6.46-01", "Release request letter from the institution", "release", "Clause 6.46", "brief"],
  ["req-646-02", "clause_6_46", "6.46-02", "Affidavit 6", "release", "Clause 6.46", "brief"],
  ["req-646-03", "clause_6_46", "6.46-03", "FDR / payment copy", "release", "Clause 6.46", "brief"],
  ["req-646-04", "clause_6_46", "6.46-04", "Latest LoA / EoA", "release", "Clause 6.46", "brief"],
  ["req-646-05", "clause_6_46", "6.46-05", "PGRC, Vigilance and other clearances", "release", "Clause 6.46", "brief"],
  ["req-646-06", "clause_6_46", "6.46-06", "Approval Bureau NOC or RTGS sanction order", "release", "Clause 6.46", "brief"],
];

export function buildChecklistRequirements(ctx: SeedContext): ChecklistRequirement[] {
  return REQUIREMENTS.map(([id, checklist, code, label, appliesTo, source, provenance]) => ({
    id,
    checklist,
    code,
    label,
    appliesTo,
    mandatory: true,
    sourceClause:
      provenance === "brief"
        ? `${source} (per project brief); handbook page not yet linked`
        : `${source} — item wording is demo configuration`,
    sourcePage: null,
    version: 1,
    effectiveFrom: ctx.d(-200),
    provenance,
  }));
}
