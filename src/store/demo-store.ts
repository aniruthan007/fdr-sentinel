"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sealEvent } from "@/lib/audit-chain";
import { can, ROLE_LABELS, type AuthzContext } from "@/lib/authz";
import { STATUS_META } from "@/lib/status";
import { todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import {
  assertTransition,
  canTransition,
  caseMachine,
  clearanceMachine,
  findingMachine,
  instrumentMachine,
  obligationMachine,
  releaseMachine,
  WorkflowError,
} from "@/lib/workflows";
import { DEMO_USERS } from "@/data/people";
import { buildSeed, type DemoData } from "@/data/seed";
import { CLEARANCE_DEPARTMENTS, CLEARANCE_DEPARTMENT_LABELS } from "@/data/releases";
import { DOCUMENT_KIND_LABELS, RECEIPT_LAYOUT } from "@/data/documents";
import type {
  Action,
  AuditDraft,
  AuditPayload,
  CaseType,
  ChecklistKind,
  ClearanceDepartment,
  ClearanceStatus,
  DocumentKind,
  DocumentRecord,
  EntityType,
  ExtractionField,
  FinancialInstrument,
  FindingSeverity,
  FindingType,
  ISODate,
  ISOTimestamp,
  Paise,
  ReleaseStatus,
  Session,
  VerificationCase,
} from "@/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Command inputs
// ---------------------------------------------------------------------------

/** A file the user picked. Only its name and size are kept — the bytes never leave the browser. */
export interface Attachment {
  kind: DocumentKind;
  fileName: string;
  sizeBytes: number;
  pages?: number;
}
export interface SubmitReleaseRequestInput {
  instrumentIds: string[];
  reason: string;
  /** Newly attached Clause 6.46 documents. */
  attachments?: Attachment[];
  /** Documents already on file (e.g. the latest LoA/EoA) to include. */
  existingDocumentIds?: string[];
}
export interface RespondToCorrectionInput {
  caseId: string;
  message: string;
  attachments: Attachment[];
}
export interface UploadDocumentInput {
  institutionId: string;
  kind: DocumentKind;
  fileName: string;
  sizeBytes: number;
  pages?: number;
  instrumentId?: string | null;
  caseId?: string | null;
}
export interface ConfirmFieldInput {
  extractionId: string;
}
export interface RaiseFindingInput {
  caseId: string;
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  field?: ExtractionField | null;
  declaredValue?: string | null;
  extractedValue?: string | null;
  recordValue?: string | null;
}
export interface RequestCorrectionInput {
  caseId: string;
  message: string;
  /** Defaults to every open finding on the case. */
  findingIds?: string[];
}
export interface RecordClearanceInput {
  clearanceId: string;
  outcome: Exclude<ClearanceStatus, "pending" | "not_requested">;
  /** Required when the outcome is Cleared. */
  reference?: string;
  /** Reason; required for every outcome except Cleared. */
  remarks: string;
}
export interface RecordDecisionInput {
  caseId: string;
  decision: "approved" | "rejected";
  reason: string;
  /** Office reference for the decision, e.g. DC/REL/2026/0027. Required. */
  referenceNo: string;
}
export interface AssignCaseInput {
  caseId: string;
  /** Defaults to the acting user. Only a Supervisor may assign someone else. */
  assigneeId?: string;
}
export interface ResolveFindingInput {
  findingId: string;
  resolution: string;
}
export interface RecordChecklistOutcomeInput {
  itemId: string;
  outcome: "satisfied" | "failed" | "not_applicable";
  evidenceDocumentId?: string | null;
  /** Required for failed and not applicable. */
  note?: string;
}
export interface MarkReadyInput {
  caseId: string;
  recommendation: string;
}
export interface RequestClearancesInput {
  releaseRequestId: string;
}
export interface RenewInstrumentInput {
  predecessorId: string;
  instrumentNo: string;
  amountPaise: Paise;
  issueDate: ISODate;
  maturityDate: ISODate;
  bankName?: string;
  /** Receipt of the renewed instrument (Annexure-2). */
  receipt?: Attachment;
}

interface DemoState {
  data: DemoData | null;
  session: Session | null;
  /** `ready` once persisted state is loaded (or a fresh seed built) on the client. */
  status: "idle" | "loading" | "ready";

  init: () => Promise<void>;
  enterAs: (userId: string) => Session | null;
  signOut: () => void;

  submitReleaseRequest: (input: SubmitReleaseRequestInput) => Promise<ActionResult>;
  uploadDocument: (input: UploadDocumentInput) => Promise<ActionResult>;
  confirmField: (input: ConfirmFieldInput) => Promise<ActionResult>;
  raiseFinding: (input: RaiseFindingInput) => Promise<ActionResult>;
  requestCorrection: (input: RequestCorrectionInput) => Promise<ActionResult>;
  recordClearance: (input: RecordClearanceInput) => Promise<ActionResult>;
  recordDecision: (input: RecordDecisionInput) => Promise<ActionResult>;
  renewInstrument: (input: RenewInstrumentInput) => Promise<ActionResult>;
  assignCase: (input: AssignCaseInput) => Promise<ActionResult>;
  resolveFinding: (input: ResolveFindingInput) => Promise<ActionResult>;
  recordChecklistOutcome: (input: RecordChecklistOutcomeInput) => Promise<ActionResult>;
  markReadyForDecision: (input: MarkReadyInput) => Promise<ActionResult>;
  requestClearances: (input: RequestClearancesInput) => Promise<ActionResult>;
  respondToCorrection: (input: RespondToCorrectionInput) => Promise<ActionResult>;
  resetDemo: () => Promise<ActionResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class CommandError extends Error {}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new CommandError(`${what} not found`);
  return value;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function nextRef(prefix: string, existing: string[]): string {
  const year = todayIST().slice(0, 4);
  const max = existing
    .filter((r) => r.startsWith(`${prefix}-${year}-`))
    .reduce((m, r) => Math.max(m, Number(r.split("-")[2]) || 0), 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

function moveInstrument(d: DemoData, inst: FinancialInstrument, to: FinancialInstrument["status"], command: string, actorId: string, now: ISOTimestamp) {
  assertTransition("instrument", instrumentMachine, inst.status, to);
  d.workflowEvents.push({ id: newId("wf"), entityType: "instrument", entityId: inst.id, command, from: inst.status, to, actorId, at: now });
  inst.status = to;
  inst.updatedAt = now;
  inst.version += 1;
}

function moveCase(d: DemoData, c: VerificationCase, to: VerificationCase["status"], command: string, actorId: string, now: ISOTimestamp) {
  assertTransition("case", caseMachine, c.status, to);
  d.workflowEvents.push({ id: newId("wf"), entityType: "case", entityId: c.id, command, from: c.status, to, actorId, at: now });
  c.status = to;
  c.updatedAt = now;
  c.version += 1;
}

/** Brings an instrument into Under review from Submitted or Needs correction, validating each step. */
function bringUnderReview(d: DemoData, inst: FinancialInstrument, actorId: string, now: ISOTimestamp) {
  if (inst.status === "submitted" || inst.status === "needs_correction") moveInstrument(d, inst, "under_review", "startReview", actorId, now);
}

/** Under review → Verified (by authorised decision) → Active. Never inferred from dates or OCR (brief §7.2). */
function verifyInstrument(d: DemoData, inst: FinancialInstrument, actorId: string, now: ISOTimestamp) {
  bringUnderReview(d, inst, actorId, now);
  moveInstrument(d, inst, "verified", "recordDecision", actorId, now);
  moveInstrument(d, inst, "active", "activate", actorId, now);
}

/** Re-derives an obligation's status from the Active instruments that secure it. */
function refreshObligation(d: DemoData, obligationId: string) {
  const ob = d.obligations.find((o) => o.id === obligationId);
  if (!ob || ob.status === "release_in_progress" || ob.status === "discharged") return;
  const covered = d.instruments
    .filter((i) => i.obligationId === obligationId && i.status === "active")
    .reduce((sum, i) => sum + i.amountPaise, 0);
  const target = covered >= ob.requiredPaise ? "secured" : covered > 0 ? "partially_secured" : "pending";
  if (target !== ob.status && canTransition(obligationMachine, ob.status, target)) ob.status = target;
}

function addChecklist(d: DemoData, caseId: string, checklist: ChecklistKind) {
  for (const req of d.checklistRequirements.filter((r) => r.checklist === checklist)) {
    d.checklistItems.push({ id: newId("cci"), caseId, requirementId: req.id, status: "pending", evidenceDocumentId: null, note: null, checkedBy: null, checkedAt: null });
  }
}

function openCase(d: DemoData, type: CaseType, title: string, institutionId: string, instrumentIds: string[], now: ISOTimestamp, releaseRequestId: string | null = null): VerificationCase {
  const c: VerificationCase = {
    id: newId("vc"),
    ref: nextRef("VC", d.cases.map((x) => x.ref)),
    type,
    title,
    institutionId,
    instrumentIds,
    releaseRequestId,
    status: "open",
    assigneeId: null,
    openedAt: now,
    updatedAt: now,
    dueDate: null,
    decision: null,
    version: 1,
  };
  d.cases.push(c);
  return c;
}

function notify(d: DemoData, n: Omit<DemoData["notifications"][number], "id" | "createdAt" | "readAt">, now: ISOTimestamp) {
  d.notifications.push({ ...n, id: newId("nt"), createdAt: now, readAt: null });
}

/**
 * SIMULATED extraction for a newly uploaded FDR receipt. There is no OCR in this prototype: the "extractor"
 * reads back the institution's declared values with plausible confidences, labelled SIMULATED, so the
 * evidence and discrepancy screens work end to end. Seeded documents use PRECOMPUTED extractions instead.
 */
function simulateExtraction(d: DemoData, doc: DocumentRecord, inst: FinancialInstrument) {
  const institution = d.institutions.find((i) => i.id === inst.institutionId);
  const values: Record<ExtractionField, string> = {
    bank_name: inst.bankName,
    instrument_no: inst.instrumentNo,
    beneficiary: institution?.name ?? "",
    amount: (inst.amountPaise / 100).toFixed(2),
    issue_date: inst.issueDate,
    maturity_date: inst.maturityDate ?? "",
    lien_holder: inst.lienHolder,
  };
  const seed = [...doc.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  (Object.keys(RECEIPT_LAYOUT) as ExtractionField[]).forEach((field, i) => {
    d.extractions.push({
      id: newId("ext"),
      documentId: doc.id,
      field,
      value: values[field],
      confidence: (86 + ((seed + i * 7) % 13)) / 100,
      page: 1,
      bbox: RECEIPT_LAYOUT[field],
      source: "SIMULATED",
      confirmedBy: null,
      confirmedAt: null,
    });
  });
  doc.status = "extracted";
}

/** Records an attached file as a document; FDR receipts get SIMULATED extraction. */
function attach(
  d: DemoData,
  a: Attachment,
  link: { institutionId: string; instrumentId: string | null; caseId: string | null },
  actorId: string,
  now: ISOTimestamp,
): DocumentRecord {
  if (!a.fileName.trim()) throw new CommandError("Every attachment needs a file name");
  const doc: DocumentRecord = {
    id: newId("doc"),
    institutionId: link.institutionId,
    instrumentId: link.instrumentId,
    caseId: link.caseId,
    kind: a.kind,
    fileName: a.fileName.trim(),
    pages: a.pages ?? 1,
    sizeBytes: a.sizeBytes,
    status: "uploaded",
    uploadedBy: actorId,
    uploadedAt: now,
  };
  d.documents.push(doc);
  const inst = link.instrumentId ? d.instruments.find((i) => i.id === link.instrumentId) : undefined;
  if (a.kind === "fdr_receipt" && inst) simulateExtraction(d, doc, inst);
  return doc;
}

interface Effect {
  entityType: EntityType;
  entityId: string;
  institutionId: string | null;
  summary: string;
  payload?: AuditPayload;
  resultId?: string;
}

/** Audit actions are namespaced `entity.verb`; this maps each store command to its audit action. */
const AUDIT_ACTION: Record<Action, string> = {
  submitReleaseRequest: "release.submitted",
  uploadDocument: "document.uploaded",
  confirmField: "extraction.confirmed",
  raiseFinding: "finding.raised",
  requestCorrection: "correction.requested",
  recordClearance: "clearance.recorded",
  recordDecision: "decision.recorded",
  renewInstrument: "instrument.renewal_submitted",
  assignCase: "case.assigned",
  resolveFinding: "finding.resolved",
  recordChecklistOutcome: "checklist.recorded",
  markReadyForDecision: "case.ready_for_decision",
  requestClearances: "clearances.requested",
  respondToCorrection: "correction.submitted",
  resetDemo: "demo.reset",
};

/** Clause 6.46 items satisfied by recorded clearances rather than by a manual check. */
const CLEARANCE_BACKED: ReadonlySet<string> = new Set(["req-646-05", "req-646-06"]);
/** In production a supervisor assigns clearances; the demo has a single clearance officer. */
const DEFAULT_CLEARANCE_OFFICER = "u-co";

// Commands are serialised so each audit event chains onto the one before it.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => {
      /**
       * The single path for every state change:
       *   authorise → clone → validate + mutate → seal audit event onto the chain → commit.
       * Nothing is written if any step fails.
       */
      function command(
        action: Action,
        scope: (d: DemoData) => AuthzContext["resourceInstitutionId"],
        mutate: (d: DemoData, now: ISOTimestamp, session: Session) => Effect,
      ): Promise<ActionResult> {
        return serial(async () => {
          const { data, session } = get();
          if (!data || !session) return { ok: false, error: "Choose a demo role first." };
          try {
            const resourceInstitutionId = scope(data);
            if (!can(session.role, action, { actorInstitutionId: session.institutionId, resourceInstitutionId })) {
              return { ok: false, error: `${ROLE_LABELS[session.role]} is not permitted to ${action}.` };
            }
            const draft = structuredClone(data);
            const now = new Date().toISOString();
            const effect = mutate(draft, now, session);
            const audit: AuditDraft = {
              at: now,
              actorId: session.userId,
              actorName: session.name,
              actorRole: session.role,
              action: AUDIT_ACTION[action],
              entityType: effect.entityType,
              entityId: effect.entityId,
              institutionId: effect.institutionId,
              summary: effect.summary,
              payload: effect.payload ?? {},
            };
            draft.audit.push(await sealEvent(audit, draft.audit[draft.audit.length - 1]));
            set({ data: draft });
            return { ok: true, id: effect.resultId ?? effect.entityId };
          } catch (err) {
            if (err instanceof CommandError || err instanceof WorkflowError) return { ok: false, error: err.message };
            throw err;
          }
        });
      }

      return {
        data: null,
        session: null,
        status: "idle",

        async init() {
          if (get().status !== "idle") return;
          set({ status: "loading" });
          const today = todayIST();
          const current = get().data;
          // Demo data is regenerated each IST day so maturities stay relative to "today".
          if (!current || current.seedDay !== today) set({ data: await buildSeed(today) });
          set({ status: "ready" });
        },

        enterAs(userId) {
          const user = DEMO_USERS.find((u) => u.id === userId);
          if (!user) return null;
          const session: Session = { userId: user.id, name: user.name, role: user.role, institutionId: user.institutionId };
          set({ session });
          return session;
        },

        signOut() {
          set({ session: null });
        },

        submitReleaseRequest: (input) =>
          command(
            "submitReleaseRequest",
            (d) => d.instruments.find((i) => i.id === input.instrumentIds[0])?.institutionId,
            (d, now, s) => {
              if (input.instrumentIds.length === 0) throw new CommandError("Select at least one instrument");
              if (!input.reason.trim()) throw new CommandError("A reason is required");
              const insts = input.instrumentIds.map((id) => must(d.instruments.find((i) => i.id === id), `Instrument ${id}`));
              const { institutionId, obligationId } = insts[0];
              if (insts.some((i) => i.institutionId !== institutionId || i.obligationId !== obligationId)) {
                throw new CommandError("All instruments must secure the same obligation");
              }
              for (const inst of insts) {
                if (inst.status !== "active") throw new CommandError(`${inst.instrumentNo} is ${inst.status.replace(/_/g, " ")}; only active instruments can be released`);
              }
              // Brief §7.3.3: request letter, Affidavit 6, FDR/payment evidence and the latest LoA/EoA.
              const attachments = input.attachments ?? [];
              const existing = (input.existingDocumentIds ?? []).map((id) => must(d.documents.find((x) => x.id === id && x.institutionId === institutionId), "Document"));
              const kinds = new Set([...attachments.map((a) => a.kind), ...existing.map((x) => x.kind)]);
              const missing = (["release_application", "affidavit", "letter_of_approval"] as const).filter((k) => !kinds.has(k));
              if (missing.length) throw new CommandError(`Attach the ${missing.map((k) => DOCUMENT_KIND_LABELS[k]).join(", ")}`);
              if (!insts.every((i) => d.documents.some((x) => x.instrumentId === i.id && x.kind === "fdr_receipt"))) {
                throw new CommandError("Every instrument needs its FDR / payment receipt on file");
              }
              const total = insts.reduce((sum, i) => sum + i.amountPaise, 0);
              const rrId = newId("rr");
              const ref = nextRef("RR", d.releaseRequests.map((r) => r.ref));
              const c = openCase(d, "release", `Release request ${ref}`, institutionId, input.instrumentIds, now, rrId);
              assertTransition("release", releaseMachine, "draft", "submitted");
              d.releaseRequests.push({
                id: rrId, ref, institutionId, obligationId, instrumentIds: input.instrumentIds, totalPaise: total,
                reason: input.reason.trim(), status: "submitted", caseId: c.id, submittedBy: s.userId, submittedAt: now, decidedAt: null,
              });
              d.workflowEvents.push({ id: newId("wf"), entityType: "release_request", entityId: rrId, command: "submitReleaseRequest", from: "draft", to: "submitted", actorId: s.userId, at: now });
              for (const inst of insts) moveInstrument(d, inst, "release_requested", "submitReleaseRequest", s.userId, now);
              const ob = must(d.obligations.find((o) => o.id === obligationId), "Obligation");
              if (canTransition(obligationMachine, ob.status, "release_in_progress")) ob.status = "release_in_progress";
              for (const department of CLEARANCE_DEPARTMENTS) {
                // Not requested until an officer reaches the clearance stage (brief §7.3–7.4).
                d.clearances.push({ id: newId("clr"), releaseRequestId: rrId, department, source: "SIMULATED", status: "not_requested", reference: null, remarks: null, assignedTo: null, requestedAt: null, recordedBy: null, recordedAt: null });
              }
              addChecklist(d, c.id, "clause_6_46");
              for (const a of attachments) attach(d, a, { institutionId, instrumentId: a.kind === "affidavit" ? insts[0].id : null, caseId: c.id }, s.userId, now);
              // Documents already on file are linked to this case if they are not tied to another one.
              for (const x of existing) if (!x.caseId) x.caseId = c.id;
              notify(d, { recipientRole: "processing_officer", institutionId: null, severity: "info", title: `New release request ${ref}`, body: `${formatINR(total)} across ${insts.length} instrument(s).`, href: "/official/releases" }, now);
              return { entityType: "release_request", entityId: rrId, institutionId, summary: `Submitted release request ${ref} for ${formatINR(total)}`, payload: { totalPaise: total, instruments: insts.length, documents: attachments.length + existing.length } };
            },
          ),

        uploadDocument: (input) =>
          command(
            "uploadDocument",
            () => input.institutionId,
            (d, now, s) => {
              must(d.institutions.find((i) => i.id === input.institutionId), "Institution");
              if (!input.fileName.trim()) throw new CommandError("File name is required");
              if (input.instrumentId) {
                const inst = must(d.instruments.find((i) => i.id === input.instrumentId), "Instrument");
                if (inst.institutionId !== input.institutionId) throw new CommandError("Instrument belongs to another institution");
              }
              const { id } = attach(d, input, { institutionId: input.institutionId, instrumentId: input.instrumentId ?? null, caseId: input.caseId ?? null }, s.userId, now);
              return { entityType: "document", entityId: id, institutionId: input.institutionId, summary: `Uploaded ${input.fileName}`, payload: { kind: input.kind, sizeBytes: input.sizeBytes } };
            },
          ),

        confirmField: (input) =>
          command(
            "confirmField",
            (d) => {
              const ext = d.extractions.find((e) => e.id === input.extractionId);
              return d.documents.find((doc) => doc.id === ext?.documentId)?.institutionId;
            },
            (d, now, s) => {
              const ext = must(d.extractions.find((e) => e.id === input.extractionId), "Extraction");
              if (ext.confirmedAt) throw new CommandError("Field already confirmed");
              const doc = must(d.documents.find((x) => x.id === ext.documentId), "Document");
              ext.confirmedBy = s.userId;
              ext.confirmedAt = now;
              if (d.extractions.filter((e) => e.documentId === doc.id).every((e) => e.confirmedAt) && doc.status === "extracted") {
                doc.status = "confirmed";
              }
              return { entityType: "extraction", entityId: ext.id, institutionId: doc.institutionId, summary: `Confirmed ${ext.field.replace(/_/g, " ")} on ${doc.fileName}`, payload: { field: ext.field, value: ext.value, confidence: ext.confidence } };
            },
          ),

        raiseFinding: (input) =>
          command(
            "raiseFinding",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              if (!input.description.trim()) throw new CommandError("Describe the finding");
              const id = newId("fd");
              d.findings.push({
                id, caseId: c.id, type: input.type, severity: input.severity, field: input.field ?? null,
                declaredValue: input.declaredValue ?? null, extractedValue: input.extractedValue ?? null, recordValue: input.recordValue ?? null,
                description: input.description.trim(), status: "open", raisedBy: s.userId, raisedAt: now, resolvedAt: null, resolution: null,
              });
              if (c.status === "open") moveCase(d, c, "in_review", "raiseFinding", s.userId, now);
              else if (!["in_review", "awaiting_institution"].includes(c.status)) throw new CommandError(`Cannot raise a finding on a case that is ${c.status}`);
              // A finding is a review item, not an accusation: the instrument simply stays Under review.
              for (const inst of d.instruments.filter((i) => c.instrumentIds.includes(i.id))) {
                if (inst.status === "submitted") bringUnderReview(d, inst, s.userId, now);
              }
              return { entityType: "finding", entityId: id, institutionId: c.institutionId, summary: `${input.type.replace(/_/g, " ")} on ${c.ref}: ${input.description.trim()}`, payload: { severity: input.severity, caseRef: c.ref } };
            },
          ),

        requestCorrection: (input) =>
          command(
            "requestCorrection",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              if (!input.message.trim()) throw new CommandError("Tell the institution what to correct");
              if (c.status === "open") moveCase(d, c, "in_review", "startReview", s.userId, now);
              moveCase(d, c, "awaiting_institution", "requestCorrection", s.userId, now);
              const targets = d.findings.filter((f) => f.caseId === c.id && (input.findingIds ? input.findingIds.includes(f.id) : f.status === "open"));
              for (const f of targets) {
                assertTransition("finding", findingMachine, f.status, "correction_requested");
                f.status = "correction_requested";
              }
              for (const inst of d.instruments.filter((i) => c.instrumentIds.includes(i.id))) {
                if (inst.status === "submitted") bringUnderReview(d, inst, s.userId, now);
                if (inst.status === "under_review") moveInstrument(d, inst, "needs_correction", "requestCorrection", s.userId, now);
              }
              notify(d, { recipientRole: null, institutionId: c.institutionId, severity: "warning", title: `Correction requested on ${c.ref}`, body: input.message.trim(), href: "/institution/deposits" }, now);
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `Requested correction on ${c.ref}: ${input.message.trim()}`, payload: { findings: targets.length } };
            },
          ),

        recordClearance: (input) =>
          command(
            "recordClearance",
            (d) => {
              const clr = d.clearances.find((x) => x.id === input.clearanceId);
              return d.releaseRequests.find((r) => r.id === clr?.releaseRequestId)?.institutionId;
            },
            (d, now, s) => {
              const clr = must(d.clearances.find((x) => x.id === input.clearanceId), "Clearance");
              const rr = must(d.releaseRequests.find((r) => r.id === clr.releaseRequestId), "Release request");
              // Brief §2.1: a clearance officer records only clearances assigned to them.
              if (clr.assignedTo !== s.userId) throw new CommandError("This clearance is not assigned to you");
              const reference = input.reference?.trim() ?? "";
              const remarks = input.remarks.trim();
              // Brief §7.4: Cleared needs a reference; every other outcome needs a reason.
              if (input.outcome === "cleared" && !reference) throw new CommandError("A clearance reference is required");
              if (input.outcome !== "cleared" && !remarks) throw new CommandError("A reason is required for this outcome");
              assertTransition("clearance", clearanceMachine, clr.status, input.outcome);
              clr.status = input.outcome;
              clr.reference = reference || null;
              clr.remarks = remarks || null;
              clr.recordedBy = s.userId;
              clr.recordedAt = now;

              // Tick the Clause 6.46 item the clearances evidence: 6.46-05 (PGRC, Vigilance and other
              // clearances) and 6.46-06 (Approval Bureau NOC).
              const all = d.clearances.filter((x) => x.releaseRequestId === rr.id);
              const done = (deps: string[]) => all.filter((x) => deps.includes(x.department)).every((x) => x.status === "cleared" || x.status === "not_applicable");
              const reqFor: Record<string, ClearanceDepartment[]> = { "req-646-05": ["pgrc", "vigilance_cell", "finance"], "req-646-06": ["approval_bureau"] };
              for (const item of d.checklistItems.filter((i) => i.caseId === rr.caseId && reqFor[i.requirementId])) {
                if (item.status === "pending" && done(reqFor[item.requirementId])) {
                  item.status = "satisfied";
                  item.checkedBy = s.userId;
                  item.checkedAt = now;
                }
              }

              const c = must(d.cases.find((x) => x.id === rr.caseId), "Case");
              if (all.every((x) => x.status === "cleared" || x.status === "not_applicable")) {
                assertTransition("release", releaseMachine, rr.status, "ready_for_decision");
                d.workflowEvents.push({ id: newId("wf"), entityType: "release_request", entityId: rr.id, command: "clearancesComplete", from: rr.status, to: "ready_for_decision", actorId: s.userId, at: now });
                rr.status = "ready_for_decision";
                if (c.status === "open") moveCase(d, c, "in_review", "startReview", s.userId, now);
                if (c.status === "in_review") moveCase(d, c, "ready_for_decision", "clearancesComplete", s.userId, now);
                notify(d, { recipientRole: "approver", institutionId: null, severity: "info", title: `${c.ref} is ready for authorised decision`, body: `All clearances recorded for ${rr.ref}.`, href: "/official/decisions" }, now);
              } else if (input.outcome === "not_cleared" || input.outcome === "error_unavailable") {
                notify(d, { recipientRole: "processing_officer", institutionId: null, severity: "critical", title: `${STATUS_META[input.outcome].label}: ${rr.ref}`, body: `${CLEARANCE_DEPARTMENT_LABELS[clr.department]}: ${clr.remarks ?? "no reason recorded"}`, href: "/official/releases" }, now);
              }
              return { entityType: "clearance", entityId: clr.id, institutionId: rr.institutionId, summary: `${CLEARANCE_DEPARTMENT_LABELS[clr.department]} recorded ${input.outcome.replace(/_/g, " ")} on ${rr.ref}`, payload: { outcome: input.outcome, department: clr.department, reference: clr.reference } };
            },
          ),

        recordDecision: (input) =>
          command(
            "recordDecision",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              const reason = input.reason.trim();
              const referenceNo = input.referenceNo.trim();
              if (!reason) throw new CommandError("A reason is required for every decision");
              if (!referenceNo) throw new CommandError("A reference number is required for every decision");
              const blocking = d.findings.filter((f) => f.caseId === c.id && f.status !== "resolved" && f.severity === "critical");
              if (input.decision === "approved" && blocking.length > 0) throw new CommandError(`${blocking.length} critical finding(s) are unresolved`);
              moveCase(d, c, input.decision, "recordDecision", s.userId, now);
              c.decision = { outcome: input.decision, reason, referenceNo, decidedBy: s.userId, decidedAt: now };
              const insts = d.instruments.filter((i) => c.instrumentIds.includes(i.id));

              if (c.type === "release") {
                const rr = must(d.releaseRequests.find((r) => r.id === c.releaseRequestId), "Release request");
                assertTransition("release", releaseMachine, rr.status, input.decision);
                rr.status = input.decision;
                rr.decidedAt = now;
                const ob = d.obligations.find((o) => o.id === rr.obligationId);
                if (input.decision === "approved") {
                  // Records the decision only. Never releases money or generates an official NOC (brief §7.3.8).
                  for (const inst of insts) moveInstrument(d, inst, "released", "recordDecision", s.userId, now);
                  // A partial release leaves the obligation secured by what remains; it is discharged only
                  // when no instrument still stands against it.
                  const remaining = d.instruments.some((i) => i.obligationId === rr.obligationId && ["active", "release_requested", "submitted", "under_review", "needs_correction", "verified"].includes(i.status));
                  const target = remaining ? "secured" : "discharged";
                  if (ob && canTransition(obligationMachine, ob.status, target)) ob.status = target;
                } else {
                  for (const inst of insts) moveInstrument(d, inst, "active", "recordDecision", s.userId, now);
                  if (ob && canTransition(obligationMachine, ob.status, "secured")) ob.status = "secured";
                }
              } else if (input.decision === "approved") {
                for (const inst of insts.filter((i) => i.status !== "active" && i.status !== "replaced")) {
                  verifyInstrument(d, inst, s.userId, now);
                  const pred = d.instruments.find((p) => p.id === inst.predecessorInstrumentId);
                  if (c.type === "renewal" && pred && pred.status === "active") {
                    moveInstrument(d, pred, "replaced", "recordDecision", s.userId, now);
                    d.renewals.push({ id: newId("rn"), institutionId: inst.institutionId, predecessorInstrumentId: pred.id, successorInstrumentId: inst.id, renewedAt: now, recordedBy: s.userId });
                  }
                }
              } else {
                for (const inst of insts.filter((i) => i.status !== "active" && i.status !== "replaced")) {
                  if (inst.status === "submitted") bringUnderReview(d, inst, s.userId, now);
                  moveInstrument(d, inst, "rejected", "recordDecision", s.userId, now);
                }
              }
              for (const obId of new Set(insts.map((i) => i.obligationId))) refreshObligation(d, obId);
              notify(d, { recipientRole: null, institutionId: c.institutionId, severity: input.decision === "approved" ? "success" : "critical", title: `${d.releaseRequests.find((r) => r.id === c.releaseRequestId)?.ref ?? c.ref} ${input.decision} (ref. ${referenceNo})`, body: reason, href: c.type === "release" ? "/institution/releases" : "/institution" }, now);
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `${input.decision === "approved" ? "Approved" : "Rejected"} ${c.ref} (ref. ${referenceNo}): ${reason}`, payload: { decision: input.decision, caseType: c.type, referenceNo } };
            },
          ),

        renewInstrument: (input) =>
          command(
            "renewInstrument",
            (d) => d.instruments.find((i) => i.id === input.predecessorId)?.institutionId,
            (d, now, s) => {
              const pred = must(d.instruments.find((i) => i.id === input.predecessorId), "Instrument");
              if (pred.status !== "active") throw new CommandError(`Only an active instrument can be renewed (this one is ${pred.status})`);
              if (d.instruments.some((i) => i.predecessorInstrumentId === pred.id && i.status !== "rejected")) throw new CommandError("A renewal is already in progress");
              if (!input.instrumentNo.trim()) throw new CommandError("Instrument number is required");
              if (!Number.isInteger(input.amountPaise) || input.amountPaise < pred.amountPaise) throw new CommandError("Renewal amount must be at least the current amount");
              if (input.maturityDate <= input.issueDate) throw new CommandError("Maturity must be after issue date");
              const id = newId("fdr");
              d.instruments.push({
                ...pred, id, instrumentNo: input.instrumentNo.trim(), bankName: input.bankName ?? pred.bankName, amountPaise: input.amountPaise,
                issueDate: input.issueDate, maturityDate: input.maturityDate, status: "submitted", predecessorInstrumentId: pred.id,
                submittedAt: now, updatedAt: now, version: 1,
              });
              d.workflowEvents.push({ id: newId("wf"), entityType: "instrument", entityId: id, command: "renewInstrument", from: null, to: "submitted", actorId: s.userId, at: now });
              const c = openCase(d, "renewal", `Renewal of ${pred.instrumentNo}`, pred.institutionId, [pred.id, id], now);
              addChecklist(d, c.id, "annexure_2");
              if (input.receipt) attach(d, { ...input.receipt, kind: "fdr_receipt" }, { institutionId: pred.institutionId, instrumentId: id, caseId: c.id }, s.userId, now);
              notify(d, { recipientRole: "processing_officer", institutionId: null, severity: "info", title: `Renewal submitted for ${pred.instrumentNo}`, body: `Successor ${input.instrumentNo.trim()} awaits verification (${c.ref}).`, href: "/official/cases" }, now);
              return { entityType: "instrument", entityId: id, institutionId: pred.institutionId, summary: `Submitted renewal ${input.instrumentNo.trim()} for ${pred.instrumentNo}`, payload: { predecessor: pred.id, amountPaise: input.amountPaise } };
            },
          ),

        assignCase: (input) =>
          command(
            "assignCase",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              const assignee = input.assigneeId ?? s.userId;
              if (s.role === "processing_officer") {
                if (assignee !== s.userId) throw new CommandError("Only a supervisor can assign work to someone else");
                if (c.assigneeId && c.assigneeId !== s.userId) throw new CommandError("Case is already assigned");
              }
              const user = DEMO_USERS.find((u) => u.id === assignee);
              if (!user || user.role !== "processing_officer") throw new CommandError("Cases can only be assigned to a processing officer");
              if (["approved", "rejected", "closed"].includes(c.status)) throw new CommandError(`Case is ${c.status}`);
              c.assigneeId = assignee;
              c.updatedAt = now;
              c.version += 1;
              if (c.status === "open") moveCase(d, c, "in_review", "assignCase", s.userId, now);
              for (const inst of d.instruments.filter((i) => c.instrumentIds.includes(i.id) && i.status === "submitted")) {
                bringUnderReview(d, inst, s.userId, now);
              }
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `${c.ref} assigned to ${user.name}`, payload: { assigneeId: assignee } };
            },
          ),

        resolveFinding: (input) =>
          command(
            "resolveFinding",
            (d) => {
              const f = d.findings.find((x) => x.id === input.findingId);
              return d.cases.find((c) => c.id === f?.caseId)?.institutionId;
            },
            (d, now, s) => {
              const f = must(d.findings.find((x) => x.id === input.findingId), "Finding");
              const c = must(d.cases.find((x) => x.id === f.caseId), "Case");
              const resolution = input.resolution.trim();
              if (!resolution) throw new CommandError("Describe how the finding was resolved");
              assertTransition("finding", findingMachine, f.status, "resolved");
              f.status = "resolved";
              f.resolvedAt = now;
              f.resolution = resolution;
              const unresolved = d.findings.some((x) => x.caseId === c.id && x.status !== "resolved");
              if (!unresolved) {
                if (c.status === "awaiting_institution") moveCase(d, c, "in_review", "resolveFinding", s.userId, now);
                for (const inst of d.instruments.filter((i) => c.instrumentIds.includes(i.id))) {
                  if (inst.status === "needs_correction") bringUnderReview(d, inst, s.userId, now);
                }
              }
              return { entityType: "finding", entityId: f.id, institutionId: c.institutionId, summary: `Resolved ${f.type.replace(/_/g, " ")} on ${c.ref}: ${resolution}`, payload: { caseRef: c.ref } };
            },
          ),

        recordChecklistOutcome: (input) =>
          command(
            "recordChecklistOutcome",
            (d) => {
              const item = d.checklistItems.find((x) => x.id === input.itemId);
              return d.cases.find((c) => c.id === item?.caseId)?.institutionId;
            },
            (d, now, s) => {
              const item = must(d.checklistItems.find((x) => x.id === input.itemId), "Checklist item");
              const c = must(d.cases.find((x) => x.id === item.caseId), "Case");
              const req = must(d.checklistRequirements.find((r) => r.id === item.requirementId), "Requirement");
              if (CLEARANCE_BACKED.has(req.id)) throw new CommandError("This item is satisfied by recorded clearances, not manually");
              if (["approved", "rejected", "closed"].includes(c.status)) throw new CommandError(`Case is ${c.status}`);
              if (item.status === "satisfied") throw new CommandError("Item already satisfied");
              const note = input.note?.trim() ?? "";
              if (input.outcome !== "satisfied" && !note) throw new CommandError("A reason is required");
              if (input.evidenceDocumentId) must(d.documents.find((x) => x.id === input.evidenceDocumentId), "Evidence document");
              item.status = input.outcome;
              item.evidenceDocumentId = input.evidenceDocumentId ?? item.evidenceDocumentId;
              item.note = note || null;
              item.checkedBy = s.userId;
              item.checkedAt = now;
              if (c.status === "open") moveCase(d, c, "in_review", "recordChecklistOutcome", s.userId, now);
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `${req.code} ${input.outcome.replace(/_/g, " ")} on ${c.ref}`, payload: { requirement: req.code, outcome: input.outcome } };
            },
          ),

        markReadyForDecision: (input) =>
          command(
            "markReadyForDecision",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              if (c.type === "release") throw new CommandError("A release case becomes ready when every clearance is recorded");
              const recommendation = input.recommendation.trim();
              if (!recommendation) throw new CommandError("Add a recommendation for the approver");
              const blocking = d.findings.filter((f) => f.caseId === c.id && f.status !== "resolved" && f.severity === "critical");
              if (blocking.length) throw new CommandError(`${blocking.length} critical finding(s) are unresolved`);
              const open = d.checklistItems.filter((i) => i.caseId === c.id && !["satisfied", "not_applicable"].includes(i.status));
              if (open.length) throw new CommandError(`${open.length} checklist item(s) are not satisfied`);
              if (c.status === "open") moveCase(d, c, "in_review", "startReview", s.userId, now);
              moveCase(d, c, "ready_for_decision", "markReadyForDecision", s.userId, now);
              notify(d, { recipientRole: "approver", institutionId: null, severity: "info", title: `${c.ref} is ready for authorised decision`, body: recommendation, href: `/official/cases/${c.id}` }, now);
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `${c.ref} ready for authorised decision. Recommendation: ${recommendation}`, payload: { recommendation } };
            },
          ),

        requestClearances: (input) =>
          command(
            "requestClearances",
            (d) => d.releaseRequests.find((r) => r.id === input.releaseRequestId)?.institutionId,
            (d, now, s) => {
              const rr = must(d.releaseRequests.find((r) => r.id === input.releaseRequestId), "Release request");
              const c = must(d.cases.find((x) => x.id === rr.caseId), "Case");
              // Completeness review: the four Clause 6.46 documents must be checked first (brief §7.3.3).
              const docItems = d.checklistItems.filter((i) => i.caseId === c.id && !CLEARANCE_BACKED.has(i.requirementId));
              const missing = docItems.filter((i) => !["satisfied", "not_applicable"].includes(i.status));
              if (missing.length) throw new CommandError(`Complete the Clause 6.46 document checks first (${missing.length} outstanding)`);
              const path: ReleaseStatus[] = ["completeness_review", "in_verification", "awaiting_clearances"];
              for (const to of path.slice(path.indexOf(rr.status as ReleaseStatus) + 1)) {
                assertTransition("release", releaseMachine, rr.status, to);
                d.workflowEvents.push({ id: newId("wf"), entityType: "release_request", entityId: rr.id, command: "requestClearances", from: rr.status, to, actorId: s.userId, at: now });
                rr.status = to;
              }
              if (rr.status !== "awaiting_clearances") throw new CommandError(`Clearances cannot be requested while the request is ${rr.status.replace(/_/g, " ")}`);
              let requested = 0;
              for (const clr of d.clearances.filter((x) => x.releaseRequestId === rr.id && x.status === "not_requested")) {
                assertTransition("clearance", clearanceMachine, clr.status, "pending");
                clr.status = "pending";
                clr.assignedTo = DEFAULT_CLEARANCE_OFFICER;
                clr.requestedAt = now;
                requested += 1;
              }
              if (requested === 0) throw new CommandError("Every clearance on this request has already been requested");
              if (!c.assigneeId) c.assigneeId = s.userId;
              if (c.status === "open") moveCase(d, c, "in_review", "requestClearances", s.userId, now);
              notify(d, { recipientRole: "clearance_officer", institutionId: null, severity: "info", title: `${requested} clearance(s) requested on ${rr.ref}`, body: "Record each outcome with a reference.", href: "/official/clearances" }, now);
              return { entityType: "release_request", entityId: rr.id, institutionId: rr.institutionId, summary: `Requested ${requested} clearance(s) on ${rr.ref}`, payload: { requested } };
            },
          ),

        respondToCorrection: (input) =>
          command(
            "respondToCorrection",
            (d) => d.cases.find((c) => c.id === input.caseId)?.institutionId,
            (d, now, s) => {
              const c = must(d.cases.find((x) => x.id === input.caseId), "Case");
              if (c.status !== "awaiting_institution") throw new CommandError("No correction has been requested on this case");
              const message = input.message.trim();
              if (!message) throw new CommandError("Add a short note for the officer");
              if (input.attachments.length === 0) throw new CommandError("Attach the corrected document");
              const primary = c.instrumentIds[c.instrumentIds.length - 1] ?? null;
              for (const a of input.attachments) attach(d, a, { institutionId: c.institutionId, instrumentId: primary, caseId: c.id }, s.userId, now);
              moveCase(d, c, "in_review", "respondToCorrection", s.userId, now);
              for (const inst of d.instruments.filter((i) => c.instrumentIds.includes(i.id) && i.status === "needs_correction")) {
                bringUnderReview(d, inst, s.userId, now);
              }
              notify(d, { recipientRole: "processing_officer", institutionId: null, severity: "info", title: `Correction received on ${c.ref}`, body: message, href: `/official/cases/${c.id}` }, now);
              return { entityType: "case", entityId: c.id, institutionId: c.institutionId, summary: `Responded to the correction request on ${c.ref}: ${message}`, payload: { documents: input.attachments.length } };
            },
          ),

        resetDemo: () =>
          serial(async (): Promise<ActionResult> => {
            const { session } = get();
            if (!session) return { ok: false, error: "Choose a demo role first." };
            if (!can(session.role, "resetDemo")) return { ok: false, error: `${ROLE_LABELS[session.role]} is not permitted to resetDemo.` };
            const fresh = await buildSeed(todayIST());
            const reset: AuditDraft = {
              at: new Date().toISOString(),
              actorId: session.userId,
              actorName: session.name,
              actorRole: session.role,
              action: AUDIT_ACTION.resetDemo,
              entityType: "system",
              entityId: "demo",
              institutionId: null,
              summary: "Demo data reset to the seeded state",
              payload: {},
            };
            fresh.audit.push(await sealEvent(reset, fresh.audit[fresh.audit.length - 1]));
            set({ data: fresh });
            return { ok: true };
          }),
      };
    },
    {
      name: "fdr-sentinel-demo",
      // v4: finding resolutions and checklist notes. Older persisted data is discarded and reseeded.
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, session: s.session }),
      // Rehydrated manually by <DemoProvider> so server and first client render match.
      skipHydration: true,
      migrate: () => ({ data: null, session: null }),
    },
  ),
);
