import { beforeEach, describe, expect, it } from "vitest";
import { verifyChain } from "@/lib/audit-chain";
import { todayIST, addDays } from "@/lib/dates";
import { INSUFFICIENT_LABEL, replacementImpact } from "@/lib/replacement-impact";
import { currentDocument, currentReview, decisionBasis, encodeBasis } from "@/lib/reviews";
import { rupees } from "@/lib/money";
import { JUDGE_SCENARIO, scenarioDraftDates, scenarioResolvedDates } from "@/data/scenario";
import { buildSeed, type DemoData } from "@/data/seed";
import type { FinancialInstrument } from "@/types";
import { useDemoStore } from "./demo-store";

/**
 * Replacement impact, evidence versions, affected reviews and stale-decision guards.
 * These tests drive the same store commands the UI uses, in one process (one browser's local state, not a server).
 */
const store = () => useDemoStore.getState();
const data = () => store().data!;
const inst = (id: string) => data().instruments.find((i) => i.id === id)!;
const basisOf = (caseId: string) => encodeBasis(decisionBasis(data(), caseId));
const RECEIPT = { kind: "fdr_receipt" as const, fileName: "SUB-TD-2026-0187420.pdf", sizeBytes: 160_000 };

beforeEach(async () => {
  useDemoStore.setState({ data: await buildSeed(todayIST()), session: null, status: "ready" });
});

/** Institution submits the judge-scenario draft: ₹20 L deposited 15 days after the ₹25 L original matures. */
async function submitScenarioDraft(): Promise<string> {
  store().enterAs("u-owner");
  const original = inst(JUDGE_SCENARIO.originalId);
  const r = await store().renewInstrument({
    predecessorId: original.id,
    instrumentNo: JUDGE_SCENARIO.successorNo,
    amountPaise: rupees(JUDGE_SCENARIO.draftAmountRupees),
    ...scenarioDraftDates(original),
    receipt: RECEIPT,
  });
  expect(r).toMatchObject({ ok: true });
  return r.ok ? r.id! : "";
}

const caseFor = (successorId: string) => data().cases.find((c) => c.type === "renewal" && c.instrumentIds.includes(successorId))!;

async function confirmAllFields(instrumentId: string) {
  const doc = currentDocument(data(), instrumentId)!;
  for (const e of data().extractions.filter((x) => x.documentId === doc.id && !x.confirmedAt)) {
    expect((await store().confirmField({ extractionId: e.id })).ok).toBe(true);
  }
}

/** A minimal synthetic world for pure calculation tests. */
function world(overrides: { requiredRupees?: number; requirementKnown?: boolean; others?: Partial<FinancialInstrument>[] } = {}): DemoData {
  const d = structuredClone(data());
  const ob = d.obligations.find((o) => o.id === JUDGE_SCENARIO.obligationId)!;
  if (overrides.requiredRupees !== undefined) ob.requiredPaise = rupees(overrides.requiredRupees);
  if (overrides.requirementKnown !== undefined) ob.requirementKnown = overrides.requirementKnown;
  const original = d.instruments.find((i) => i.id === JUDGE_SCENARIO.originalId)!;
  for (const [n, o] of (overrides.others ?? []).entries()) {
    d.instruments.push({ ...original, id: `test-${n}`, instrumentNo: `TEST/${n}`, predecessorInstrumentId: null, status: "active", ...o });
  }
  return d;
}

const draft = (d: DemoData, amountRupees: number, delayDays: number) => {
  const original = d.instruments.find((i) => i.id === JUDGE_SCENARIO.originalId)!;
  const issueDate = addDays(original.maturityDate!, delayDays);
  return replacementImpact(d, original.id, {
    draft: { instrumentNo: "NEW/1", bankName: original.bankName, amountPaise: rupees(amountRupees), issueDate, maturityDate: addDays(issueDate, 365) },
    draftHasReceipt: true,
  });
};

describe("replacement impact — deterministic calculations", () => {
  it("computes the judge scenario: ₹5 L apparent shortfall and a 14-day gap", () => {
    const impact = draft(data(), 20_00_000, 15);
    expect(impact.requiredPaise).toBe(rupees(25_00_000));
    expect(impact.coverageAfterPaise).toBe(rupees(20_00_000));
    expect(impact.shortfallPaise).toBe(rupees(5_00_000));
    expect(impact.gapDays).toBe(14);
    const original = inst(JUDGE_SCENARIO.originalId);
    expect(impact.gapFrom).toBe(addDays(original.maturityDate!, 1));
    expect(impact.gapTo).toBe(addDays(original.maturityDate!, 14));
    expect(impact.findings.map((f) => f.code)).toEqual(expect.arrayContaining(["amount_shortfall", "date_gap"]));
    expect(impact.overall).toBe("attention");
  });

  it("treats a deposit on the day after maturity as continuous, and one day later as a 1-day gap", () => {
    expect(draft(data(), 25_00_000, 1).gapDays).toBeNull();
    expect(draft(data(), 25_00_000, 0).gapDays).toBeNull();
    expect(draft(data(), 25_00_000, 2).gapDays).toBe(1);
  });

  it("does not treat a lower successor amount as a shortfall when other accepted instruments cover the rest", () => {
    const d = world({ others: [{ amountPaise: rupees(5_00_000), maturityDate: addDays(todayIST(), 400) }] });
    const impact = draft(d, 20_00_000, 0);
    expect(impact.shortfallPaise).toBe(0);
    expect(impact.findings.find((f) => f.code === "amount_lower_but_covered")).toBeTruthy();
    expect(impact.findings.some((f) => f.code === "amount_shortfall")).toBe(false);
  });

  it("never double-counts the original and its replacement, and does not count pending candidates", () => {
    // A pending ₹10 L candidate on the same obligation is listed but not counted.
    const d = world({ others: [{ amountPaise: rupees(10_00_000), status: "under_review" }] });
    const impact = draft(d, 20_00_000, 0);
    expect(impact.coverageAfterPaise).toBe(rupees(20_00_000)); // not 20 + 25 (original), not 20 + 10 (pending)
    expect(impact.coverageBeforePaise).toBe(rupees(25_00_000));
    expect(impact.shortfallPaise).toBe(rupees(5_00_000));
    expect(impact.pendingNotCounted).toHaveLength(1);
  });

  it("ignores accepted instruments that will have matured by the handover date", () => {
    const original = inst(JUDGE_SCENARIO.originalId);
    const d = world({ others: [{ amountPaise: rupees(5_00_000), maturityDate: original.maturityDate }] });
    expect(draft(d, 20_00_000, 0).shortfallPaise).toBe(rupees(5_00_000));
  });

  it("reports unknown requirements and missing dates as insufficient information, never a pass", () => {
    const unknown = draft(world({ requirementKnown: false }), 25_00_000, 0);
    expect(unknown.shortfallPaise).toBeNull();
    expect(unknown.overall).toBe("insufficient");
    expect(unknown.overallLabel).toBe(INSUFFICIENT_LABEL);

    const original = inst(JUDGE_SCENARIO.originalId);
    const noDates = replacementImpact(data(), original.id, {
      draft: { instrumentNo: "X", bankName: "B", amountPaise: rupees(25_00_000), issueDate: null, maturityDate: null },
      draftHasReceipt: true,
    });
    expect(noDates.findings.find((f) => f.code === "dates_unknown")?.level).toBe("insufficient");
    expect(noDates.overall).not.toBe("ok");
  });
});

describe("judge scenario — original → draft → impact → pending review → resolution → decision", () => {
  it("submitting a candidate does not replace the original, and preserves its history", async () => {
    const before = structuredClone(data().reviews.filter((r) => r.instrumentId === JUDGE_SCENARIO.originalId));
    const id = await submitScenarioDraft();
    expect(inst(JUDGE_SCENARIO.originalId).status).toBe("active");
    expect(inst(id)).toMatchObject({ status: "submitted", predecessorInstrumentId: JUDGE_SCENARIO.originalId });
    expect(data().renewals.some((r) => r.successorInstrumentId === id)).toBe(false);
    // The original's reviews are untouched.
    expect(data().reviews.filter((r) => r.instrumentId === JUDGE_SCENARIO.originalId)).toEqual(before);
  });

  it("successor confirmation stays independent: nothing is copied from the original", async () => {
    const id = await submitScenarioDraft();
    expect(currentReview(data(), JUDGE_SCENARIO.originalId, "bank_confirmation")).toMatchObject({ status: "complete", reference: "SIM-SUB/CNF/2025/0451" });
    const succBank = currentReview(data(), id, "bank_confirmation")!;
    expect(succBank.status).toBe("pending");
    expect(succBank.reference).toBeNull();
    expect(succBank.evidenceDocumentId).toBe(currentDocument(data(), id)!.id);
    expect(currentReview(data(), id, "field_confirmation")!.status).toBe("pending");
    // The impact explains why the original's confirmation does not count.
    const impact = replacementImpact(data(), JUDGE_SCENARIO.originalId, { id });
    expect(impact.findings.find((f) => f.code === "bank_confirmation_missing")?.level).toBe("insufficient");
    expect(impact.findings.find((f) => f.code === "original_confirmation_not_transferable")?.reason).toContain("SIM-SUB/CNF/2025/0451");
  });

  it("blocks readiness and decision while impact needs attention", async () => {
    const id = await submitScenarioDraft();
    const c = caseFor(id);
    store().enterAs("u-po");
    const r = await store().markReadyForDecision({ caseId: c.id, recommendation: "Approve" });
    expect(r.ok).toBe(false);
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: c.id, decision: "approved", reason: "x", referenceNo: "DC/REN/1", basis: basisOf(c.id) })).ok).toBe(false);
    expect(inst(JUDGE_SCENARIO.originalId).status).toBe("active");
  });

  it("material evidence change reopens only the successor's affected reviews and keeps history", async () => {
    const id = await submitScenarioDraft();
    await confirmAllFields(id);
    store().enterAs("u-po");
    expect((await store().requestBankConfirmation({ instrumentId: id })).ok).toBe(true);
    const v1 = currentDocument(data(), id)!;
    const bankV1 = currentReview(data(), id, "bank_confirmation")!;
    expect(bankV1).toMatchObject({ status: "complete", evidenceVersion: 1, source: "SIMULATED" });
    const originalReviews = structuredClone(data().reviews.filter((r) => r.instrumentId === JUDGE_SCENARIO.originalId));
    const reviewCount = data().reviews.length;

    store().enterAs("u-owner");
    const original = inst(JUDGE_SCENARIO.originalId);
    const r = await store().amendReplacement({
      successorId: id,
      amountPaise: rupees(JUDGE_SCENARIO.resolvedAmountRupees),
      ...scenarioResolvedDates(original),
      receipt: { ...RECEIPT, fileName: "SUB-TD-2026-0187420-revised.pdf" },
      note: "Bank reissued for the full amount.",
    });
    expect(r.ok).toBe(true);

    const v2 = currentDocument(data(), id)!;
    expect(v2).toMatchObject({ version: 2, supersedesDocumentId: v1.id });
    expect(data().documents.some((x) => x.id === v1.id)).toBe(true); // earlier version kept
    expect(inst(id).declarationHistory).toHaveLength(1);
    expect(inst(id).declarationHistory![0]).toMatchObject({ amountPaise: rupees(20_00_000), receiptDocumentId: v1.id });

    const bankNow = currentReview(data(), id, "bank_confirmation")!;
    expect(bankNow).toMatchObject({ status: "pending", evidenceVersion: 2 });
    expect(bankNow.reason).toContain("receipt v1");
    expect(data().reviews.find((x) => x.id === bankV1.id)!.supersededById).toBe(bankNow.id); // superseded, not deleted
    expect(currentReview(data(), id, "field_confirmation")!.status).toBe("pending");
    expect(data().reviews.length).toBeGreaterThan(reviewCount);
    // Unrelated reviews (the original's) are not restarted.
    expect(data().reviews.filter((x) => x.instrumentId === JUDGE_SCENARIO.originalId)).toEqual(originalReviews);
    // RE-02 must be re-checked.
    const re02 = data().checklistItems.find((i) => i.caseId === caseFor(id).id && i.requirementId === "req-re-02")!;
    expect(re02.status).toBe("pending");
  });

  it("runs the full story: amend → confirm → simulated bank → ready → separate approver decision", async () => {
    const id = await submitScenarioDraft();
    const c = caseFor(id);
    const original = inst(JUDGE_SCENARIO.originalId);
    expect((await store().amendReplacement({ successorId: id, amountPaise: rupees(25_00_000), ...scenarioResolvedDates(original), receipt: RECEIPT, note: "Full amount, no gap." })).ok).toBe(true);
    let impact = replacementImpact(data(), original.id, { id });
    expect(impact.shortfallPaise).toBe(0);
    expect(impact.gapDays).toBeNull();
    expect(impact.overall).toBe("insufficient"); // evidence still pending — not a pass
    await confirmAllFields(id);

    store().enterAs("u-po");
    expect((await store().requestBankConfirmation({ instrumentId: id })).ok).toBe(true);
    for (const item of data().checklistItems.filter((i) => i.caseId === c.id && i.status === "pending")) {
      expect((await store().recordChecklistOutcome({ itemId: item.id, outcome: "satisfied", evidenceDocumentId: currentDocument(data(), id)!.id })).ok).toBe(true);
    }
    impact = replacementImpact(data(), original.id, { id });
    expect(impact.overall).toBe("ok");
    expect((await store().markReadyForDecision({ caseId: c.id, recommendation: "Replacement covers the obligation with no gap." })).ok).toBe(true);
    // Ready is not approval.
    expect(inst(JUDGE_SCENARIO.originalId).status).toBe("active");
    expect((await store().recordDecision({ caseId: c.id, decision: "approved", reason: "x", referenceNo: "DC/REN/1", basis: basisOf(c.id) })).ok).toBe(false);

    store().enterAs("u-ap");
    const r = await store().recordDecision({ caseId: c.id, decision: "approved", reason: "Replacement accepted.", referenceNo: "DC/REN/2026/0001", basis: basisOf(c.id) });
    expect(r.ok).toBe(true);
    expect(inst(id).status).toBe("active");
    expect(inst(JUDGE_SCENARIO.originalId).status).toBe("replaced");
    const rn = data().renewals.find((x) => x.successorInstrumentId === id)!;
    expect(rn).toMatchObject({ predecessorInstrumentId: JUDGE_SCENARIO.originalId, effectiveFrom: original.maturityDate, caseId: c.id });
    expect(data().obligations.find((o) => o.id === JUDGE_SCENARIO.obligationId)!.status).toBe("secured");
    // The original's own confirmation history survives acceptance.
    expect(currentReview(data(), JUDGE_SCENARIO.originalId, "bank_confirmation")!.reference).toBe("SIM-SUB/CNF/2025/0451");
    // Institution sees the outcome.
    expect(data().notifications.some((n) => n.institutionId === "inst-kit" && n.title.includes("DC/REN/2026/0001"))).toBe(true);

    const actions = data().audit.map((e) => e.action);
    for (const a of ["instrument.renewal_submitted", "instrument.replacement_amended", "extraction.confirmed", "review.bank_confirmed", "case.ready_for_decision", "decision.recorded"]) {
      expect(actions).toContain(a);
    }
    expect((await verifyChain(data().audit)).ok).toBe(true);
  });
});

describe("stale transitions and the action layer", () => {
  it("rejects a decision when evidence changed after the approver opened the case", async () => {
    store().enterAs("u-ap");
    const opened = basisOf("vc-02");
    // Meanwhile the institution adds a document to the instrument (another tab or user).
    useDemoStore.setState({ session: { userId: "ext", name: "WGCE", role: "institution_owner", institutionId: "inst-wgce" } });
    expect((await store().uploadDocument({ institutionId: "inst-wgce", kind: "bank_confirmation", fileName: "bank-letter.pdf", sizeBytes: 1, instrumentId: "fdr-wgce-01" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-02")!.status).toBe("ready_for_decision");

    store().enterAs("u-ap");
    const before = data().audit.length;
    const stale = await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/VER/1", basis: opened });
    expect(stale.ok).toBe(false);
    expect(stale.ok ? "" : stale.error).toMatch(/changed after you opened it.*evidence/);
    expect(data().cases.find((c) => c.id === "vc-02")!.decision).toBeNull();
    expect(data().audit).toHaveLength(before);
    // After reviewing the current state, the decision can be recorded.
    expect((await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/VER/1", basis: basisOf("vc-02") })).ok).toBe(true);
  });

  it("a new receipt version on a ready case recalculates readiness instead of letting the decision through", async () => {
    store().enterAs("u-ap");
    const opened = basisOf("vc-02");
    useDemoStore.setState({ session: { userId: "ext", name: "WGCE", role: "institution_owner", institutionId: "inst-wgce" } });
    expect((await store().uploadDocument({ institutionId: "inst-wgce", kind: "fdr_receipt", fileName: "reissued.pdf", sizeBytes: 1, instrumentId: "fdr-wgce-01" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-02")!.status).toBe("in_review");
    expect(currentDocument(data(), "fdr-wgce-01")!.version).toBe(2);
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/VER/1", basis: opened })).ok).toBe(false);
  });

  it("a receipt uploaded through the document centre reopens the successor's reviews", async () => {
    const id = await submitScenarioDraft();
    await confirmAllFields(id);
    store().enterAs("u-po");
    expect((await store().requestBankConfirmation({ instrumentId: id })).ok).toBe(true);
    store().enterAs("u-owner");
    expect((await store().uploadDocument({ institutionId: "inst-kit", kind: "fdr_receipt", fileName: "again.pdf", sizeBytes: 1, instrumentId: id })).ok).toBe(true);
    expect(currentReview(data(), id, "bank_confirmation")).toMatchObject({ status: "pending", evidenceVersion: 2 });
    expect(currentReview(data(), id, "field_confirmation")!.status).toBe("pending");
    expect(currentReview(data(), JUDGE_SCENARIO.originalId, "bank_confirmation")!.status).toBe("complete");
  });

  it("rejects a decision with no basis at all", async () => {
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/VER/1", basis: "" })).ok).toBe(false);
  });

  it("missing required clearances prevent decision readiness", async () => {
    store().enterAs("u-co");
    const clrs = data().clearances.filter((x) => x.releaseRequestId === "rr-01");
    const noc = clrs.find((x) => x.department === "approval_bureau")!;
    const nocEarly = await store().recordClearance({ clearanceId: noc.id, outcome: "cleared", reference: "AB/NOC/1", remarks: "" });
    expect(nocEarly.ok ? "" : nocEarly.error).toContain("follows the clearances");
    const pgrc = clrs.find((x) => x.department === "pgrc")!;
    expect((await store().recordClearance({ clearanceId: pgrc.id, outcome: "cleared", reference: "PGRC/1", remarks: "" })).ok).toBe(true);
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("awaiting_clearances");
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-05", decision: "approved", reason: "x", referenceNo: "DC/REL/1", basis: basisOf("vc-05") })).ok).toBe(false);
  });

  it("rejects unauthorised actions inside the command layer, without writing", async () => {
    const id = await submitScenarioDraft();
    const before = data().audit.length;
    // Institution cannot request a bank confirmation; officer cannot amend; operator cannot amend; approver cannot submit replacements.
    expect((await store().requestBankConfirmation({ instrumentId: id })).ok).toBe(false);
    store().enterAs("u-po");
    expect((await store().amendReplacement({ successorId: id, amountPaise: 1, issueDate: "2030-01-01", maturityDate: "2031-01-01", receipt: RECEIPT, note: "x" })).ok).toBe(false);
    store().enterAs("u-operator");
    expect((await store().amendReplacement({ successorId: id, amountPaise: 1, issueDate: "2030-01-01", maturityDate: "2031-01-01", receipt: RECEIPT, note: "x" })).ok).toBe(false);
    store().enterAs("u-ap");
    expect((await store().renewInstrument({ predecessorId: "fdr-kit-04", instrumentNo: "X", amountPaise: 1, issueDate: "2030-01-01", maturityDate: "2031-01-01" })).ok).toBe(false);
    // Bank-backed checklist item cannot be ticked by hand.
    store().enterAs("u-po");
    const re02 = data().checklistItems.find((i) => i.caseId === caseFor(id).id && i.requirementId === "req-re-02")!;
    expect((await store().recordChecklistOutcome({ itemId: re02.id, outcome: "satisfied" })).ok).toBe(false);
    expect(data().audit).toHaveLength(before);
  });

  it("an accepted or decided replacement cannot be amended", async () => {
    const id = await submitScenarioDraft();
    store().enterAs("u-ap");
    // A decision cannot be recorded before the case is ready (state machine), so reject via the normal path.
    const c = caseFor(id);
    expect((await store().recordDecision({ caseId: c.id, decision: "rejected", reason: "x", referenceNo: "R/1", basis: basisOf(c.id) })).ok).toBe(false);
    store().enterAs("u-owner");
    useDemoStore.setState({ data: { ...data(), instruments: data().instruments.map((i) => (i.id === id ? { ...i, status: "active" as const } : i)) } });
    expect((await store().amendReplacement({ successorId: id, amountPaise: rupees(25_00_000), issueDate: "2030-01-01", maturityDate: "2031-01-01", receipt: RECEIPT, note: "x" })).ok).toBe(false);
  });
});

describe("date coverage regressions — successor and supporting instruments must cover the handover", () => {
  /** Draft with explicit dates relative to the original's maturity M (handover H = M + 1). */
  const draftDates = (d: DemoData, amountRupees: number, issueFromM: number, maturityFromM: number) => {
    const original = d.instruments.find((i) => i.id === JUDGE_SCENARIO.originalId)!;
    const M = original.maturityDate!;
    return replacementImpact(d, original.id, {
      draft: { instrumentNo: "NEW/EARLY", bankName: original.bankName, amountPaise: rupees(amountRupees), issueDate: addDays(M, issueFromM), maturityDate: addDays(M, maturityFromM) },
      draftHasReceipt: true,
    });
  };

  it("a successor that starts before the handover but matures before it is not satisfactory coverage", () => {
    // Issued 30 days before the original matures, matures the day before the original does.
    const impact = draftDates(data(), 25_00_000, -30, -1);
    expect(impact.findings.some((f) => f.code === "dates_ok")).toBe(false);
    expect(impact.findings.find((f) => f.code === "successor_ends_before_handover")?.level).toBe("attention");
    // Its amount is not counted on a day it does not cover.
    expect(impact.coverageAfterPaise).toBe(0);
    expect(impact.shortfallPaise).toBe(rupees(25_00_000));
    expect(impact.overall).toBe("attention");
  });

  it("a successor maturing exactly on the original's maturity date also misses the handover day", () => {
    const impact = draftDates(data(), 25_00_000, -30, 0);
    expect(impact.findings.find((f) => f.code === "successor_ends_before_handover")?.level).toBe("attention");
    // Maturing on the handover day itself covers it (A1: inclusive).
    expect(draftDates(data(), 25_00_000, -30, 1).findings.some((f) => f.code === "successor_ends_before_handover")).toBe(false);
  });

  it("supporting instruments count only on the days they cover", () => {
    const original = inst(JUDGE_SCENARIO.originalId);
    const M = original.maturityDate!;
    // ₹5 L supporting instrument that covers the handover day but not the successor's later start (gap case).
    const d = world({ others: [{ amountPaise: rupees(5_00_000), issueDate: addDays(M, -100), maturityDate: addDays(M, 5) }] });
    const gapCase = draftDates(d, 20_00_000, 15, 380);
    // Evaluated on the successor's start (M + 15): the supporting instrument has matured, so it is not counted.
    expect(gapCase.otherAcceptedPaise).toBe(0);
    expect(gapCase.shortfallPaise).toBe(rupees(5_00_000));
    // A supporting instrument that does not cover the whole gap does not make the gap "covered".
    const d2 = world({ others: [{ amountPaise: rupees(25_00_000), issueDate: addDays(M, -100), maturityDate: addDays(M, 5) }] });
    expect(draftDates(d2, 25_00_000, 15, 380).findings.find((f) => f.code === "date_gap")?.level).toBe("attention");
    // A supporting instrument not yet in force on the evaluation day is not counted either.
    const d3 = world({ others: [{ amountPaise: rupees(5_00_000), issueDate: addDays(M, 30), maturityDate: addDays(M, 400) }] });
    expect(draftDates(d3, 20_00_000, 1, 366).otherAcceptedPaise).toBe(0);
  });

  it("notes, without blocking, a supporting instrument that matures during the successor's term", () => {
    const original = inst(JUDGE_SCENARIO.originalId);
    const M = original.maturityDate!;
    const d = world({ others: [{ amountPaise: rupees(5_00_000), issueDate: addDays(M, -100), maturityDate: addDays(M, 60) }] });
    const impact = draftDates(d, 20_00_000, 1, 366);
    expect(impact.shortfallPaise).toBe(0);
    const note = impact.findings.find((f) => f.code === "support_matures_during_term");
    expect(note?.level).toBe("info");
  });

  it("readiness and decision are refused for a successor that ends before the handover", async () => {
    store().enterAs("u-owner");
    const original = inst(JUDGE_SCENARIO.originalId);
    const M = original.maturityDate!;
    const r = await store().renewInstrument({ predecessorId: original.id, instrumentNo: "SUB/TD/2026/0000001", amountPaise: rupees(25_00_000), issueDate: addDays(M, -30), maturityDate: addDays(M, -1), receipt: RECEIPT });
    expect(r.ok).toBe(true);
    const id = r.ok ? r.id! : "";
    await confirmAllFields(id);
    store().enterAs("u-po");
    expect((await store().requestBankConfirmation({ instrumentId: id })).ok).toBe(true);
    const c = caseFor(id);
    for (const item of data().checklistItems.filter((i) => i.caseId === c.id && i.status === "pending")) {
      await store().recordChecklistOutcome({ itemId: item.id, outcome: "satisfied", evidenceDocumentId: currentDocument(data(), id)!.id });
    }
    // Every evidence review is complete, yet the date coverage keeps it from being ready.
    const ready = await store().markReadyForDecision({ caseId: c.id, recommendation: "Approve" });
    expect(ready.ok).toBe(false);
    expect(ready.ok ? "" : ready.error).toContain("matures before the handover");
    // Even if the case were ready, the decision command re-checks and refuses approval.
    useDemoStore.setState({ data: { ...data(), cases: data().cases.map((x) => (x.id === c.id ? { ...x, status: "ready_for_decision" as const } : x)) } });
    store().enterAs("u-ap");
    const decided = await store().recordDecision({ caseId: c.id, decision: "approved", reason: "x", referenceNo: "DC/REN/9", basis: basisOf(c.id) });
    expect(decided.ok).toBe(false);
    expect(decided.ok ? "" : decided.error).toContain("matures before the handover");
    expect(inst(original.id).status).toBe("active");
  });
});

describe("Clause 6.46 distinctions — clearances as applicable, then NOC (FDR/RPGF) or Council sanction (RTGS)", () => {
  const RELEASE_DOCS = [
    { kind: "release_application" as const, fileName: "request-letter.pdf", sizeBytes: 120_000 },
    { kind: "affidavit" as const, fileName: "affidavit-6.pdf", sizeBytes: 98_000 },
  ];

  it("keeps 'other applicable cells' open-ended: recordable as not applicable only with a reason", async () => {
    store().enterAs("u-co");
    const other = data().clearances.find((c) => c.releaseRequestId === "rr-01" && c.department === "other_applicable")!;
    expect(other.status).toBe("pending");
    expect((await store().recordClearance({ clearanceId: other.id, outcome: "not_applicable", remarks: "" })).ok).toBe(false);
    expect((await store().recordClearance({ clearanceId: other.id, outcome: "not_applicable", remarks: "No other cell applies to a programme discontinuation." })).ok).toBe(true);
    // Not applicable is a recorded determination, not a silent omission.
    expect(data().clearances.find((c) => c.id === other.id)).toMatchObject({ status: "not_applicable", recordedBy: "u-co" });
  });

  it("refuses the NOC while any applicable clearance, including other cells, is outstanding", async () => {
    store().enterAs("u-co");
    const clrs = data().clearances.filter((c) => c.releaseRequestId === "rr-01");
    for (const dept of ["pgrc", "vigilance_cell"] as const) {
      const c = clrs.find((x) => x.department === dept)!;
      expect((await store().recordClearance({ clearanceId: c.id, outcome: "cleared", reference: `${dept}/1`, remarks: "" })).ok).toBe(true);
    }
    const noc = clrs.find((c) => c.department === "approval_bureau")!;
    const early = await store().recordClearance({ clearanceId: noc.id, outcome: "cleared", reference: "AB/NOC/1", remarks: "" });
    expect(early.ok ? "" : early.error).toContain("Other applicable cells / bureaus");
  });

  it("an RTGS release needs the Council sanction order, not the Approval Bureau NOC", async () => {
    // Yamuna School of Management's institution owner, acting on its own RTGS instrument.
    useDemoStore.setState({ session: { userId: "ext-inst-ysm", name: "YSM", role: "institution_owner", institutionId: "inst-ysm" } });
    const r = await store().submitReleaseRequest({ instrumentIds: ["rtgs-ysm-03"], reason: "Programme closed", attachments: RELEASE_DOCS, existingDocumentIds: ["doc-ysm-loa"] });
    expect(r.ok).toBe(true);
    const rr = data().releaseRequests.at(-1)!;
    const depts = data().clearances.filter((c) => c.releaseRequestId === rr.id).map((c) => c.department);
    expect(depts).toEqual(["pgrc", "vigilance_cell", "other_applicable", "council_sanction"]);
    expect(depts).not.toContain("approval_bureau");

    store().enterAs("u-po");
    for (const item of data().checklistItems.filter((i) => i.caseId === rr.caseId && !["req-646-05", "req-646-06"].includes(i.requirementId))) {
      expect((await store().recordChecklistOutcome({ itemId: item.id, outcome: "satisfied" })).ok).toBe(true);
    }
    expect((await store().requestClearances({ releaseRequestId: rr.id })).ok).toBe(true);
    store().enterAs("u-co");
    const clrs = data().clearances.filter((c) => c.releaseRequestId === rr.id);
    const sanction = clrs.find((c) => c.department === "council_sanction")!;
    expect((await store().recordClearance({ clearanceId: sanction.id, outcome: "cleared", reference: "CS/1", remarks: "" })).ok).toBe(false);
    for (const c of clrs.filter((x) => x.department !== "council_sanction")) {
      expect((await store().recordClearance({ clearanceId: c.id, outcome: "cleared", reference: `R/${c.department}`, remarks: "" })).ok).toBe(true);
    }
    expect(data().releaseRequests.find((x) => x.id === rr.id)!.status).toBe("awaiting_clearances");
    expect((await store().recordClearance({ clearanceId: sanction.id, outcome: "cleared", reference: "CS/RTGS/1", remarks: "" })).ok).toBe(true);
    expect(data().releaseRequests.find((x) => x.id === rr.id)!.status).toBe("ready_for_decision");
    expect(data().checklistItems.filter((i) => i.caseId === rr.caseId).every((i) => i.status === "satisfied")).toBe(true);
  });

  it("labels the default applicability as demo configuration and the distinctions as from the brief", () => {
    const rules = new Map(data().policyRules.map((r) => [r.code, r]));
    expect(rules.get("RELEASE_DEFAULT_APPLICABILITY")!.provenance).toBe("demo_config");
    expect(rules.get("RELEASE_CLEARANCES")!.provenance).toBe("brief");
    expect(rules.get("RELEASE_FINAL_AUTHORITY")!.title).toMatch(/NOC for FDR\/RPGF.*Council sanction order for RTGS/);
  });
});
