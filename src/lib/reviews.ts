import type { DemoData } from "@/data/seed";
import type { DocumentRecord, ReviewKind, ReviewRecord } from "@/types";

export const REVIEW_KINDS: ReviewKind[] = ["field_confirmation", "consistency_check", "bank_confirmation"];

export const REVIEW_KIND_LABELS: Record<ReviewKind, string> = {
  field_confirmation: "Extracted fields confirmed",
  consistency_check: "Automated consistency check",
  bank_confirmation: "Bank confirmation of specified details",
};

/** What each kind of result does — and does not — establish. Shown beside every review. */
export const REVIEW_KIND_MEANING: Record<ReviewKind, string> = {
  field_confirmation: "A person confirmed what was read from the document. Not a check of authenticity.",
  consistency_check: "Deterministic comparison of declared values with extracted values. Not a check of authenticity.",
  bank_confirmation: "An authorised bank source confirmed the specified details. SIMULATED in this prototype.",
};

/** The current evidence document of a kind for an instrument: the newest version that nothing supersedes. */
export function currentDocument(d: Pick<DemoData, "documents">, instrumentId: string, kind: DocumentRecord["kind"] = "fdr_receipt"): DocumentRecord | undefined {
  const docs = d.documents.filter((x) => x.instrumentId === instrumentId && x.kind === kind);
  const superseded = new Set(docs.map((x) => x.supersedesDocumentId).filter(Boolean));
  return docs.filter((x) => !superseded.has(x.id)).sort((a, b) => b.version - a.version || b.uploadedAt.localeCompare(a.uploadedAt))[0];
}

/** The current (not superseded) review of each kind for an instrument. */
export function currentReview(d: Pick<DemoData, "reviews">, instrumentId: string, kind: ReviewKind): ReviewRecord | undefined {
  return d.reviews.find((r) => r.instrumentId === instrumentId && r.kind === kind && !r.supersededById);
}

export function currentReviews(d: Pick<DemoData, "reviews">, instrumentId: string): ReviewRecord[] {
  return REVIEW_KINDS.map((k) => currentReview(d, instrumentId, k)).filter((r): r is ReviewRecord => !!r);
}

/** Full history for an instrument, newest first. */
export function reviewHistory(d: Pick<DemoData, "reviews">, instrumentId: string): ReviewRecord[] {
  return d.reviews.filter((r) => r.instrumentId === instrumentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A review counts only if it is complete AND concerns the instrument's current evidence version. */
export function isCurrentAndComplete(d: Pick<DemoData, "reviews" | "documents">, instrumentId: string, kind: ReviewKind): boolean {
  const r = currentReview(d, instrumentId, kind);
  const doc = currentDocument(d, instrumentId);
  return !!r && r.status === "complete" && !!doc && r.evidenceDocumentId === doc.id;
}

// ---------------------------------------------------------------------------
// Decision basis — what the approver saw when they opened the case
// ---------------------------------------------------------------------------

export interface DecisionBasis {
  caseState: string;
  instruments: string;
  evidence: string;
  reviews: string;
  clearances: string;
  findings: string;
}

const BASIS_LABELS: Record<keyof DecisionBasis, string> = {
  caseState: "case state",
  instruments: "instrument details or holds",
  evidence: "evidence documents",
  reviews: "reviews and confirmations",
  clearances: "clearances",
  findings: "findings",
};

/**
 * A deterministic snapshot of everything a decision depends on. The UI captures it when the case is opened and
 * sends it with the decision; `recordDecision` recomputes it and rejects the decision if anything moved.
 */
export function decisionBasis(d: DemoData, caseId: string): DecisionBasis {
  const c = d.cases.find((x) => x.id === caseId);
  if (!c) return { caseState: "missing", instruments: "", evidence: "", reviews: "", clearances: "", findings: "" };
  const insts = d.instruments.filter((i) => c.instrumentIds.includes(i.id));
  const rr = d.releaseRequests.find((r) => r.id === c.releaseRequestId);
  const docs = d.documents.filter((x) => x.caseId === c.id || (x.instrumentId && c.instrumentIds.includes(x.instrumentId)));
  return {
    caseState: `${c.status}|v${c.version}|${rr?.status ?? "-"}`,
    instruments: insts.map((i) => `${i.id}:${i.status}:v${i.version}:${i.amountPaise}:${i.issueDate}:${i.maturityDate}`).join(","),
    evidence: docs.map((x) => `${x.id}:v${x.version}`).sort().join(","),
    reviews: insts.flatMap((i) => currentReviews(d, i.id)).map((r) => `${r.id}:${r.status}`).join(","),
    clearances: d.clearances.filter((x) => x.releaseRequestId === c.releaseRequestId).map((x) => `${x.id}:${x.status}`).join(","),
    findings: d.findings.filter((f) => f.caseId === c.id).map((f) => `${f.id}:${f.status}`).join(","),
  };
}

export function encodeBasis(b: DecisionBasis): string {
  return JSON.stringify(b);
}

/** Human-readable list of what changed between two bases; empty when they match. */
export function basisChanges(opened: string, current: DecisionBasis): string[] {
  let prev: Partial<DecisionBasis>;
  try {
    prev = JSON.parse(opened) as Partial<DecisionBasis>;
  } catch {
    return ["the case snapshot could not be read"];
  }
  return (Object.keys(BASIS_LABELS) as (keyof DecisionBasis)[]).filter((k) => prev[k] !== current[k]).map((k) => BASIS_LABELS[k]);
}
