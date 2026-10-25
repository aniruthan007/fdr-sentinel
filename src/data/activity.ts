import type {
  AppNotification,
  AuditDraft,
  AuditPayload,
  EntityType,
  Institution,
  Job,
  Role,
  WorkflowEvent,
} from "@/types";
import type { SeedContext } from "./context";
import { DEMO_USERS } from "./people";

export function buildNotifications(ctx: SeedContext): AppNotification[] {
  return [
    {
      id: "nt-01",
      recipientRole: null,
      institutionId: "inst-kit",
      severity: "critical",
      title: "Correction may be needed on FDR NGB/FDR/2026/7731045",
      body: "The receipt amount differs from what you declared. A processing officer is reviewing.",
      href: "/institution/deposits",
      createdAt: ctx.t(-2, 11, 16),
      readAt: null,
    },
    {
      id: "nt-02",
      recipientRole: null,
      institutionId: "inst-kit",
      severity: "warning",
      title: "FDR DMB/FD/2025/341177 matures in 18 days",
      body: "Renew it and upload the new receipt before maturity to keep the deposit secured.",
      href: "/institution/renewals",
      createdAt: ctx.t(0, 6, 5),
      readAt: null,
    },
    {
      id: "nt-03",
      recipientRole: null,
      institutionId: "inst-kit",
      severity: "info",
      title: "Release request RR-2026-0027 — 2 of 4 clearances recorded",
      body: "Finance and Approval Bureau have cleared. PGRC is pending; Vigilance Cell needs further information.",
      href: "/institution/releases",
      createdAt: ctx.t(-8, 14, 31),
      readAt: ctx.t(-7, 9, 12),
    },
    {
      id: "nt-04",
      recipientRole: "processing_officer",
      institutionId: null,
      severity: "info",
      title: "New case VC-2026-0143 in the queue",
      body: "Hooghly Institute of Technology submitted an intake-increase FDR.",
      href: "/official/cases",
      createdAt: ctx.t(-1, 15, 36),
      readAt: null,
    },
    {
      id: "nt-05",
      recipientRole: "clearance_officer",
      institutionId: null,
      severity: "warning",
      title: "2 clearances outstanding on RR-2026-0027",
      body: "PGRC and Vigilance Cell clearances are outstanding for Kaveri Institute of Technology.",
      href: "/official/clearances",
      createdAt: ctx.t(-8, 14, 32),
      readAt: null,
    },
    {
      id: "nt-06",
      recipientRole: "approver",
      institutionId: null,
      severity: "info",
      title: "VC-2026-0142 is ready for decision",
      body: "Western Ghats College of Engineering — all checks complete, no findings.",
      href: "/official/decisions",
      createdAt: ctx.t(-1, 16, 31),
      readAt: null,
    },
    {
      id: "nt-07",
      recipientRole: "processing_officer",
      institutionId: null,
      severity: "critical",
      title: "FDR CFB/FD/2025/003502 matured without renewal",
      body: "Malabar College of Engineering — maturity date passed 2 days ago.",
      href: "/official/maturity",
      createdAt: ctx.t(0, 6, 5),
      readAt: null,
    },
  ];
}

type WfRow = [entityType: EntityType, entityId: string, command: string, from: string | null, to: string, actor: string, offset: number, h: number, m: number];

const WORKFLOW: WfRow[] = [
  ["instrument", "fdr-kit-05", "submitInstrument", null, "submitted", "u-owner", -6, 15, 20],
  ["case", "vc-01", "openCase", null, "open", "system", -6, 15, 40],
  ["case", "vc-01", "startReview", "open", "in_review", "u-po", -3, 10, 30],
  ["instrument", "fdr-kit-05", "startReview", "submitted", "under_review", "u-po", -3, 10, 31],
  ["case", "vc-02", "startReview", "open", "in_review", "u-po", -5, 11, 0],
  ["case", "vc-02", "markReady", "in_review", "ready_for_decision", "u-po", -1, 16, 30],
  ["case", "vc-03", "requestCorrection", "open", "awaiting_institution", "u-po", -3, 10, 5],
  ["release_request", "rr-01", "submitReleaseRequest", "draft", "submitted", "u-owner", -12, 13, 50],
  ["release_request", "rr-01", "startCompletenessReview", "submitted", "completeness_review", "u-po", -11, 9, 30],
  ["release_request", "rr-01", "startVerification", "completeness_review", "in_verification", "u-po", -11, 9, 50],
  ["release_request", "rr-01", "requestClearances", "in_verification", "awaiting_clearances", "u-po", -11, 10, 0],
  ["clearance", "clr-04", "requestFurtherInfo", "pending", "further_info_required", "u-co", -7, 14, 30],
  ["release_request", "rr-02", "recordDecision", "ready_for_decision", "approved", "u-ap", -35, 15, 20],
  ["release_request", "rr-02", "closeRequest", "approved", "closed", "u-po", -34, 17, 0],
];

export function buildWorkflowEvents(ctx: SeedContext): WorkflowEvent[] {
  return WORKFLOW.map(([entityType, entityId, command, from, to, actorId, offset, h, m], i) => ({
    id: `wf-${String(i + 1).padStart(3, "0")}`,
    entityType,
    entityId,
    command,
    from,
    to,
    actorId,
    at: ctx.t(offset, h, m),
  }));
}

export function buildJobs(ctx: SeedContext): Job[] {
  return [
    {
      id: "job-01",
      kind: "maturity_scan",
      status: "succeeded",
      scheduledFor: ctx.t(0, 6, 0),
      startedAt: ctx.t(0, 6, 0),
      finishedAt: ctx.t(0, 6, 4),
      result: "Scanned 26 instruments: 7 within 30 days, 1 matured without renewal.",
    },
    {
      id: "job-02",
      kind: "reminder_dispatch",
      status: "succeeded",
      scheduledFor: ctx.t(0, 6, 5),
      startedAt: ctx.t(0, 6, 5),
      finishedAt: ctx.t(0, 6, 5),
      result: "8 reminders queued (SIMULATED delivery).",
    },
    {
      id: "job-03",
      kind: "maturity_scan",
      status: "queued",
      scheduledFor: ctx.t(1, 6, 0),
      startedAt: null,
      finishedAt: null,
      result: null,
    },
  ];
}

type AuditRow = [offset: number, h: number, m: number, actor: string, action: string, entityType: EntityType, entityId: string, institutionId: string | null, summary: string, payload?: AuditPayload];

/** Seeded history, oldest first. Sealed into a SHA-256 chain when the store initialises. */
const AUDIT: AuditRow[] = [
  [-1095, 15, 20, "u-owner", "instrument.submitted", "instrument", "fdr-kit-01", "inst-kit", "Submitted FDR DMB/FD/2023/118204 for ₹50,00,000.00", { amountPaise: 500000000 }],
  [-1090, 12, 0, "u-po", "instrument.verified", "instrument", "fdr-kit-01", "inst-kit", "Verified FDR DMB/FD/2023/118204"],
  [-730, 12, 0, "u-po", "instrument.renewed", "renewal", "rn-01", "inst-kit", "Renewal recorded: DMB/FD/2023/118204 → DMB/FD/2024/220913", { predecessor: "fdr-kit-01", successor: "fdr-kit-02" }],
  [-500, 15, 20, "u-owner", "instrument.submitted", "instrument", "fdr-kit-06", "inst-kit", "Submitted FDR DMB/FD/2024/298850 for ₹15,00,000.00", { amountPaise: 150000000 }],
  [-365, 15, 30, "u-owner", "instrument.submitted", "instrument", "fdr-kit-03", "inst-kit", "Submitted renewal FDR DMB/FD/2025/341177", { predecessor: "fdr-kit-02" }],
  [-360, 12, 30, "u-po", "instrument.renewed", "renewal", "rn-02", "inst-kit", "Renewal recorded: DMB/FD/2024/220913 → DMB/FD/2025/341177", { predecessor: "fdr-kit-02", successor: "fdr-kit-03" }],
  [-360, 12, 35, "u-ap", "decision.recorded", "case", "vc-07", "inst-kit", "Approved renewal case VC-2025-0412 (ref. DC/REN/2025/0412)", { decision: "approved", referenceNo: "DC/REN/2025/0412" }],
  [-70, 10, 40, "ext-inst-ysm", "release.submitted", "release_request", "rr-02", "inst-ysm", "Submitted release request RR-2026-0011 for ₹30,00,000.00", { totalPaise: 300000000 }],
  [-55, 14, 30, "u-co", "clearance.recorded", "clearance", "clr-05", "inst-ysm", "Finance cleared RR-2026-0011", { outcome: "cleared" }],
  [-41, 14, 30, "u-co", "clearance.recorded", "clearance", "clr-08", "inst-ysm", "Vigilance Cell cleared RR-2026-0011 — all clearances complete", { outcome: "cleared" }],
  [-35, 15, 20, "u-ap", "decision.recorded", "case", "vc-06", "inst-ysm", "Approved release RR-2026-0011 (ref. DC/REL/2026/0011)", { decision: "approved", referenceNo: "DC/REL/2026/0011" }],
  [-34, 17, 0, "u-po", "instrument.released", "instrument", "fdr-ysm-01", "inst-ysm", "Released FDR NGB/FDR/2023/5100214 to the institution"],
  [-12, 13, 50, "u-owner", "release.submitted", "release_request", "rr-01", "inst-kit", "Submitted release request RR-2026-0027 for ₹15,00,000.00", { totalPaise: 150000000 }],
  [-9, 14, 30, "u-co", "clearance.recorded", "clearance", "clr-01", "inst-kit", "Finance cleared RR-2026-0027", { outcome: "cleared" }],
  [-9, 15, 20, "ext-inst-wgce", "instrument.submitted", "instrument", "fdr-wgce-01", "inst-wgce", "Submitted FDR CFB/FD/2026/004417 for ₹1,00,00,000.00", { amountPaise: 1000000000 }],
  [-8, 14, 30, "u-co", "clearance.recorded", "clearance", "clr-02", "inst-kit", "Approval Bureau issued NOC on RR-2026-0027", { outcome: "cleared" }],
  [-7, 14, 30, "u-co", "clearance.recorded", "clearance", "clr-04", "inst-kit", "Vigilance Cell requested further information on RR-2026-0027", { outcome: "further_info_required" }],
  [-6, 15, 20, "u-owner", "instrument.submitted", "instrument", "fdr-kit-05", "inst-kit", "Submitted FDR NGB/FDR/2026/7731045 for ₹25,00,000.00", { amountPaise: 250000000 }],
  [-6, 15, 25, "u-owner", "document.uploaded", "document", "doc-kit-aff", "inst-kit", "Uploaded KIT-Affidavit-intake-2026.pdf"],
  [-4, 15, 20, "ext-inst-dpip", "instrument.submitted", "instrument", "fdr-dpip-01", "inst-dpip", "Submitted FDR SCB/FD/2026/2290 for ₹60,00,000.00", { amountPaise: 600000000 }],
  [-3, 10, 0, "u-po", "finding.raised", "finding", "fd-03", "inst-dpip", "Missing document: affidavit not uploaded", { severity: "critical" }],
  [-3, 10, 5, "u-po", "correction.requested", "case", "vc-03", "inst-dpip", "Requested the affidavit from Deccan Plateau Institute of Pharmacy"],
  [-2, 11, 10, "u-po", "finding.raised", "finding", "fd-01", "inst-kit", "Amount mismatch: declared ₹25,00,000.00, receipt ₹20,00,000.00", { severity: "critical" }],
  [-2, 11, 12, "u-po", "finding.raised", "finding", "fd-02", "inst-kit", "Maturity date mismatch: receipt is 30 days earlier", { severity: "warning" }],
  [-1, 15, 20, "ext-inst-hit", "instrument.submitted", "instrument", "fdr-hit-03", "inst-hit", "Submitted FDR SCB/FD/2026/2311 for ₹25,00,000.00", { amountPaise: 250000000 }],
  [-1, 16, 30, "u-po", "case.ready_for_decision", "case", "vc-02", "inst-wgce", "VC-2026-0142 checks complete — no findings"],
  [0, 6, 4, "system", "job.maturity_scan", "system", "job-01", null, "Daily maturity scan: 7 within 30 days, 1 matured", { scanned: 26 }],
];

export function buildAuditDrafts(ctx: SeedContext, institutions: Institution[]): AuditDraft[] {
  return AUDIT.map(([offset, h, m, actorId, action, entityType, entityId, institutionId, summary, payload]) => {
    const user = DEMO_USERS.find((u) => u.id === actorId);
    let actorName = user?.name ?? "System";
    let actorRole: Role | "system" = user?.role ?? "system";
    if (actorId.startsWith("ext-")) {
      const inst = institutions.find((i) => i.id === actorId.slice(4));
      actorName = inst?.contactName ?? "Institution user";
      actorRole = "institution_owner";
    }
    return {
      at: ctx.t(offset, h, m),
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      institutionId,
      summary,
      payload: payload ?? {},
    };
  });
}
