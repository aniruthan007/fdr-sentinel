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
      title: "Maturity reminder window: 30 days (configurable product setting)",
      description: "Instruments maturing within this many days are shown as Near maturity and reminders are queued. A product setting, not an AICTE deadline; brief §7.5 suggests 90/60/30/7 days and maturity day as demo defaults.",
      sourceClause: "Product setting — not a regulatory deadline",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
    {
      id: "pr-02",
      code: "ESCALATION_WINDOW_DAYS",
      title: "Escalation window: 7 days (configurable product setting)",
      description: "Instruments within this many days of maturity with no recorded successor are escalated to the supervisor. An internal work target, not a statutory deadline.",
      sourceClause: "Product setting — not a regulatory deadline",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
    {
      id: "pr-03",
      code: "RELEASE_CLEARANCES",
      title: "Release: clearance outcomes from PGRC, the Vigilance Cell and other relevant cells/bureaus, as applicable",
      description: "Not an exhaustive list: which cells apply depends on the case. No Finance clearance is assumed.",
      sourceClause: `Clause 6.46 (per project brief §3.5); ${PENDING_SOURCE.toLowerCase()}`,
      sourcePage: null,
      version: 3,
      effectiveFrom,
      provenance: "brief",
    },
    {
      id: "pr-06",
      code: "RELEASE_FINAL_AUTHORITY",
      title: "After clearances: Approval Bureau NOC for FDR/RPGF; Council sanction order for RTGS — separate records",
      description: "A release covering FDR/RPGF needs the Approval Bureau NOC; one covering RTGS needs the Council sanction order. Each is recordable only after the clearances.",
      sourceClause: `Clause 6.46 (per project brief §3.5 and the supplied handbook extract); ${PENDING_SOURCE.toLowerCase()}`,
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "brief",
    },
    {
      id: "pr-07",
      code: "RELEASE_DEFAULT_APPLICABILITY",
      title: "Demo default: every release requests PGRC, Vigilance Cell and an 'other applicable cells' determination",
      description: "Which cells apply to a given release has not been established for this demo. Each entry can be recorded Not applicable with a reason; 'Other applicable cells / bureaus' records which further cell applies, or why none does.",
      sourceClause: "Demo configuration — applicability rule not established",
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
    {
      id: "pr-05",
      code: "REPLACEMENT_DATE_ASSUMPTIONS",
      title: "Replacement impact: coverage runs deposit date → maturity date inclusive; successor needed from the day after maturity; no grace period",
      description: "Demo assumptions A1–A7: amounts compared on one evaluation day (handover, or the successor's deposit date if later), counting only instruments in force that day; a successor maturing before the handover is flagged; later maturities of other instruments are noted, not assessed. No statutory date rule has been established; see docs/replacement-impact.md.",
      sourceClause: "Demo assumption — not a regulatory rule",
      sourcePage: null,
      version: 1,
      effectiveFrom,
      provenance: "demo_config",
    },
  ];
}

type ReqRow = [id: string, checklist: ChecklistRequirement["checklist"], code: string, label: string, appliesTo: ChecklistRequirement["appliesTo"], source: string, provenance: ChecklistRequirement["provenance"]];

const DEMO_CHECKLIST_SOURCE =
  "Demo configuration — prototype checklist, not taken from Annexure-1/2 (those are approval-process document lists)";

/** Three separate checklists. Release uses Clause 6.46 only; the other two are labelled demo configuration. */
const REQUIREMENTS: ReqRow[] = [
  ["req-dl-01", "deposit_lodgement", "DL-01", "Instrument receipt (FDR / RPGF / RTGS)", "deposit_verification", DEMO_CHECKLIST_SOURCE, "demo_config"],
  ["req-dl-02", "deposit_lodgement", "DL-02", "Applicable affidavit from the institution", "deposit_verification", DEMO_CHECKLIST_SOURCE, "demo_config"],
  ["req-dl-03", "deposit_lodgement", "DL-03", "Latest LoA / EoA", "deposit_verification", DEMO_CHECKLIST_SOURCE, "demo_config"],
  ["req-re-01", "replacement_evidence", "RE-01", "Receipt of the replacement instrument (current evidence version)", "renewal", DEMO_CHECKLIST_SOURCE, "demo_config"],
  ["req-re-02", "replacement_evidence", "RE-02", "Bank confirmation of the replacement instrument's details", "renewal", DEMO_CHECKLIST_SOURCE, "demo_config"],
  // Clause 6.46: the six items listed in the brief (CLAUDE.md §3.4).
  ["req-646-01", "clause_6_46", "6.46-01", "Release request letter from the institution", "release", "Clause 6.46", "brief"],
  ["req-646-02", "clause_6_46", "6.46-02", "Affidavit 6", "release", "Clause 6.46", "brief"],
  ["req-646-03", "clause_6_46", "6.46-03", "FDR / payment copy", "release", "Clause 6.46", "brief"],
  ["req-646-04", "clause_6_46", "6.46-04", "Latest LoA / EoA", "release", "Clause 6.46", "brief"],
  ["req-646-05", "clause_6_46", "6.46-05", "PGRC, Vigilance Cell and other relevant cells/bureaus — clearances as applicable", "release", "Clause 6.46", "brief"],
  ["req-646-06", "clause_6_46", "6.46-06", "Approval Bureau NOC (FDR/RPGF) or Council sanction order (RTGS), after clearances", "release", "Clause 6.46", "brief"],
];

export function buildChecklistRequirements(ctx: SeedContext): ChecklistRequirement[] {
  return REQUIREMENTS.map(([id, checklist, code, label, appliesTo, source, provenance]) => ({
    id,
    checklist,
    code,
    label,
    appliesTo,
    mandatory: true,
    sourceClause: provenance === "brief" ? `${source} (per project brief); handbook page not yet linked` : source,
    sourcePage: null,
    version: 1,
    effectiveFrom: ctx.d(-200),
    provenance,
  }));
}
