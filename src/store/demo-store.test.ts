import { beforeEach, describe, expect, it } from "vitest";
import { verifyChain } from "@/lib/audit-chain";
import { can } from "@/lib/authz";
import { formatDate, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { instrumentDisplayStatus } from "@/lib/status";
import { buildSeed } from "@/data/seed";
import { useDemoStore } from "./demo-store";

const store = () => useDemoStore.getState();
const data = () => store().data!;

beforeEach(async () => {
  useDemoStore.setState({ data: await buildSeed(todayIST()), session: null, status: "ready" });
});

describe("seed", () => {
  it("has the required shape and a valid audit chain", async () => {
    const d = data();
    expect(d.institutions).toHaveLength(8);
    expect(d.instruments.length).toBeGreaterThanOrEqual(25);
    expect((await verifyChain(d.audit)).ok).toBe(true);
    // Three-generation renewal lineage
    const gen3 = d.instruments.find((i) => i.id === "fdr-kit-03")!;
    const gen2 = d.instruments.find((i) => i.id === gen3.predecessorInstrumentId)!;
    expect(gen2.predecessorInstrumentId).toBe("fdr-kit-01");
  });

  it("keeps maturities relative to today", () => {
    const kit03 = data().instruments.find((i) => i.id === "fdr-kit-03")!;
    expect(instrumentDisplayStatus(kit03, todayIST())).toBe("near_maturity");
  });
});

describe("dates", () => {
  it("formats as DD MMM YYYY", () => {
    expect(formatDate("2026-09-07")).toBe("07 Sep 2026");
  });
});

describe("money", () => {
  it("formats paise with Indian grouping", () => {
    expect(formatINR(1_25_00_000_00)).toBe("₹1,25,00,000.00");
    expect(formatINR(12_345)).toBe("₹123.45");
  });
});

describe("authz", () => {
  it("enforces the role matrix and institution scope", () => {
    expect(can("approver", "recordDecision")).toBe(true);
    expect(can("processing_officer", "recordDecision")).toBe(false);
    expect(can("auditor", "raiseFinding")).toBe(false);
    expect(can("institution_owner", "uploadDocument", { actorInstitutionId: "inst-kit", resourceInstitutionId: "inst-kit" })).toBe(true);
    expect(can("institution_owner", "uploadDocument", { actorInstitutionId: "inst-kit", resourceInstitutionId: "inst-wgce" })).toBe(false);
  });

  it("matches brief §2.1 least privilege", () => {
    expect(can("institution_operator", "uploadDocument")).toBe(true);
    expect(can("institution_operator", "submitReleaseRequest")).toBe(false);
    expect(can("institution_operator", "renewInstrument")).toBe(false);
    expect(can("processing_officer", "uploadDocument")).toBe(false);
    expect(can("supervisor", "raiseFinding")).toBe(false);
    expect(can("system_admin", "recordDecision")).toBe(false);
    expect(can("policy_admin", "recordDecision")).toBe(false);
    for (const action of ["submitReleaseRequest", "uploadDocument", "confirmField", "raiseFinding", "requestCorrection", "recordClearance", "recordDecision", "renewInstrument"] as const) {
      expect(can("auditor", action)).toBe(false);
    }
  });
});

describe("commands", () => {
  it("rejects a command the role may not perform, without writing", async () => {
    store().enterAs("u-aud");
    const before = data().audit.length;
    const r = await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/X/1" });
    expect(r.ok).toBe(false);
    expect(data().audit).toHaveLength(before);
  });

  it("blocks an institution acting on another institution's records", async () => {
    store().enterAs("u-owner");
    const r = await store().uploadDocument({ institutionId: "inst-wgce", kind: "affidavit", fileName: "x.pdf", sizeBytes: 1 });
    expect(r.ok).toBe(false);
  });

  it("runs a clean approval and appends hash-chained events", async () => {
    store().enterAs("u-ap");
    const r = await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "All fields match.", referenceNo: "DC/VER/2026/0142" });
    expect(r).toEqual({ ok: true, id: "vc-02" });
    // Under review → Verified → Active, each an explicit, recorded transition (brief §7.2).
    expect(data().instruments.find((i) => i.id === "fdr-wgce-01")!.status).toBe("active");
    const steps = data().workflowEvents.filter((e) => e.entityId === "fdr-wgce-01").map((e) => e.to);
    expect(steps.slice(-2)).toEqual(["verified", "active"]);
    expect(data().audit.at(-1)!.action).toBe("decision.recorded");
    expect((await verifyChain(data().audit)).ok).toBe(true);
  });

  it("requires a reason and a reference number for every decision", async () => {
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: " " })).ok).toBe(false);
    expect(data().cases.find((c) => c.id === "vc-02")!.status).toBe("ready_for_decision");
    expect((await store().recordDecision({ caseId: "vc-02", decision: "approved", reason: "ok", referenceNo: "DC/VER/1" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-02")!.decision).toMatchObject({ referenceNo: "DC/VER/1", decidedBy: "u-ap" });
  });

  it("uses the six Clause 6.46 items and the four brief clearance sources", () => {
    const items = data().checklistRequirements.filter((r) => r.checklist === "clause_6_46");
    expect(items).toHaveLength(6);
    expect(items.every((r) => r.provenance === "brief")).toBe(true);
    expect(new Set(data().clearances.map((c) => c.department))).toEqual(new Set(["pgrc", "vigilance_cell", "approval_bureau", "finance"]));
  });

  it("refuses approval while a critical finding is open", async () => {
    store().enterAs("u-ap");
    const r = await store().recordDecision({ caseId: "vc-01", decision: "approved", reason: "x", referenceNo: "DC/X/2" });
    expect(r.ok).toBe(false);
  });

  it("completes a release: clearances → ready for authorised decision → approved", async () => {
    store().enterAs("u-co");
    const outstanding = data().clearances.filter((x) => x.releaseRequestId === "rr-01" && x.status !== "cleared");
    expect(outstanding.map((c) => c.status).sort()).toEqual(["further_info_required", "pending"]);
    for (const c of outstanding) {
      expect((await store().recordClearance({ clearanceId: c.id, outcome: "cleared", reference: `REF/${c.id}`, remarks: "" })).ok).toBe(true);
    }
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("ready_for_decision");
    expect(data().cases.find((c) => c.id === "vc-05")!.status).toBe("ready_for_decision");
    expect(data().checklistItems.filter((i) => i.caseId === "vc-05").every((i) => i.status === "satisfied")).toBe(true);

    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-05", decision: "approved", reason: "Release.", referenceNo: "DC/REL/2026/0027" })).ok).toBe(true);
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("approved");
    expect(data().instruments.find((i) => i.id === "fdr-kit-06")!.status).toBe("released");
    expect((await verifyChain(data().audit)).ok).toBe(true);
  });

  it("renews an instrument, linking the predecessor and keeping history", async () => {
    store().enterAs("u-owner");
    const today = todayIST();
    const r = await store().renewInstrument({ predecessorId: "fdr-kit-03", instrumentNo: "DMB/FD/2026/400001", amountPaise: 50_00_000_00, issueDate: today, maturityDate: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}` });
    expect(r.ok).toBe(true);
    const succ = data().instruments.find((i) => i.id === (r.ok ? r.id : ""))!;
    expect(succ.predecessorInstrumentId).toBe("fdr-kit-03");
    expect(data().instruments.find((i) => i.id === "fdr-kit-03")!.status).toBe("active");
  });

  it("submits a release request with SIMULATED clearances", async () => {
    store().enterAs("u-owner");
    const r = await store().submitReleaseRequest({ instrumentIds: ["fdr-kit-04"], reason: "Test" });
    expect(r.ok).toBe(true);
    const rr = data().releaseRequests.at(-1)!;
    expect(rr.status).toBe("submitted");
    const clearances = data().clearances.filter((c) => c.releaseRequestId === rr.id);
    expect(clearances).toHaveLength(4);
    expect(clearances.every((c) => c.status === "not_requested" && c.source === "SIMULATED")).toBe(true);
  });

  it("raises a finding, requests correction, and resets the demo", async () => {
    store().enterAs("u-po");
    expect((await store().raiseFinding({ caseId: "vc-04", type: "name_mismatch", severity: "warning", description: "Beneficiary name abbreviated" })).ok).toBe(true);
    expect((await store().requestCorrection({ caseId: "vc-04", message: "Upload a corrected receipt" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-04")!.status).toBe("awaiting_institution");
    expect(data().instruments.find((i) => i.id === "fdr-hit-03")!.status).toBe("needs_correction");
    expect((await store().resetDemo()).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-04")!.status).toBe("open");
    expect(data().audit.at(-1)!.action).toBe("demo.reset");
  });

  it("enforces brief §7.4 clearance rules", async () => {
    store().enterAs("u-co");
    const pgrc = data().clearances.find((c) => c.releaseRequestId === "rr-01" && c.department === "pgrc")!;
    // Cleared needs a reference; other outcomes need a reason.
    expect((await store().recordClearance({ clearanceId: pgrc.id, outcome: "cleared", remarks: "ok" })).ok).toBe(false);
    expect((await store().recordClearance({ clearanceId: pgrc.id, outcome: "not_applicable", remarks: "" })).ok).toBe(false);
    // Error / unavailable is never treated as cleared.
    expect((await store().recordClearance({ clearanceId: pgrc.id, outcome: "error_unavailable", remarks: "Source timed out" })).ok).toBe(true);
    expect((await store().recordClearance({ clearanceId: pgrc.id, outcome: "cleared", reference: "PGRC/1", remarks: "" })).ok).toBe(false);
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("awaiting_clearances");
  });

  it("only lets the assigned clearance officer record a clearance", async () => {
    const pgrc = data().clearances.find((c) => c.releaseRequestId === "rr-01" && c.department === "pgrc")!;
    useDemoStore.setState({ data: { ...data(), clearances: data().clearances.map((c) => (c.id === pgrc.id ? { ...c, assignedTo: "someone-else" } : c)) } });
    store().enterAs("u-co");
    const r = await store().recordClearance({ clearanceId: pgrc.id, outcome: "cleared", reference: "PGRC/1", remarks: "" });
    expect(r).toEqual({ ok: false, error: "This clearance is not assigned to you" });
  });

  it("lets a processing officer claim an unassigned case but not someone else's", async () => {
    store().enterAs("u-po");
    expect((await store().assignCase({ caseId: "vc-04" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-04")).toMatchObject({ assigneeId: "u-po", status: "in_review" });
    expect(data().instruments.find((i) => i.id === "fdr-hit-03")!.status).toBe("under_review");
    expect((await store().assignCase({ caseId: "vc-04", assigneeId: "u-sup" })).ok).toBe(false);
  });

  it("takes the mismatch case to ready via findings, checklist and recommendation", async () => {
    store().enterAs("u-po");
    expect((await store().markReadyForDecision({ caseId: "vc-01", recommendation: "Approve" })).ok).toBe(false);
    for (const f of data().findings.filter((x) => x.caseId === "vc-01")) {
      expect((await store().resolveFinding({ findingId: f.id, resolution: "Corrected receipt matches declaration" })).ok).toBe(true);
    }
    expect((await store().markReadyForDecision({ caseId: "vc-01", recommendation: "Approve: corrected receipt matches." })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-01")!.status).toBe("ready_for_decision");
  });

  it("records checklist outcomes, never manually for clearance-backed items", async () => {
    store().enterAs("u-po");
    const affidavit = data().checklistItems.find((i) => i.caseId === "vc-03" && i.requirementId === "req-a1-02")!;
    expect((await store().recordChecklistOutcome({ itemId: affidavit.id, outcome: "not_applicable", note: "" })).ok).toBe(false);
    expect((await store().recordChecklistOutcome({ itemId: affidavit.id, outcome: "satisfied", evidenceDocumentId: "doc-dpip-loa" })).ok).toBe(true);
    const clearanceItem = data().checklistItems.find((i) => i.caseId === "vc-05" && i.requirementId === "req-646-05")!;
    expect((await store().recordChecklistOutcome({ itemId: clearanceItem.id, outcome: "satisfied" })).ok).toBe(false);
  });

  it("runs a new release request through completeness review to requested clearances", async () => {
    store().enterAs("u-owner");
    const r = await store().submitReleaseRequest({ instrumentIds: ["fdr-kit-04"], reason: "Programme closed" });
    expect(r.ok).toBe(true);
    const rr = data().releaseRequests.at(-1)!;
    store().enterAs("u-po");
    expect((await store().requestClearances({ releaseRequestId: rr.id })).ok).toBe(false); // documents unchecked
    for (const item of data().checklistItems.filter((i) => i.caseId === rr.caseId && !["req-646-05", "req-646-06"].includes(i.requirementId))) {
      expect((await store().recordChecklistOutcome({ itemId: item.id, outcome: "satisfied" })).ok).toBe(true);
    }
    expect((await store().requestClearances({ releaseRequestId: rr.id })).ok).toBe(true);
    expect(data().releaseRequests.find((x) => x.id === rr.id)!.status).toBe("awaiting_clearances");
    const clearances = data().clearances.filter((c) => c.releaseRequestId === rr.id);
    expect(clearances.every((c) => c.status === "pending" && c.assignedTo === "u-co")).toBe(true);
    const steps = data().workflowEvents.filter((e) => e.entityId === rr.id).map((e) => e.to);
    expect(steps).toEqual(["submitted", "completeness_review", "in_verification", "awaiting_clearances"]);
  });

  it("RR-2026-0027 cross-role: clearances → ready → approved, visible everywhere", async () => {
    store().enterAs("u-co");
    for (const c of data().clearances.filter((x) => x.releaseRequestId === "rr-01" && x.status !== "cleared")) {
      expect((await store().recordClearance({ clearanceId: c.id, outcome: "cleared", reference: `REF/${c.department}`, remarks: "" })).ok).toBe(true);
    }
    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-05", decision: "approved", reason: "All Clause 6.46 items and clearances recorded.", referenceNo: "DC/REL/2026/0027" })).ok).toBe(true);
    const d = data();
    expect(d.releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("approved");
    expect(d.cases.find((c) => c.id === "vc-05")).toMatchObject({ status: "approved", decision: { referenceNo: "DC/REL/2026/0027" } });
    expect(d.instruments.find((i) => i.id === "fdr-kit-06")!.status).toBe("released");
    expect(d.obligations.find((o) => o.id === "ob-kit-prog")!.status).toBe("discharged");
    expect(d.notifications.some((n) => n.institutionId === "inst-kit" && n.title === "RR-2026-0027 approved (ref. DC/REL/2026/0027)")).toBe(true);
    expect((await verifyChain(d.audit)).ok).toBe(true);
  });

  it("detects tampering in the audit chain", async () => {
    const chain = structuredClone(data().audit);
    chain[5].summary = "Edited after the fact";
    const verdict = await verifyChain(chain);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.brokenAtSeq).toBe(chain[5].seq);
  });
});
