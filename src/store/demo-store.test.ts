import { beforeEach, describe, expect, it } from "vitest";
import { verifyChain } from "@/lib/audit-chain";
import { can } from "@/lib/authz";
import { todayIST } from "@/lib/dates";
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
});

describe("commands", () => {
  it("rejects a command the role may not perform, without writing", async () => {
    store().enterAs("u-aud");
    const before = data().audit.length;
    const r = await store().recordDecision({ caseId: "vc-02", decision: "approved", remarks: "ok" });
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
    const r = await store().recordDecision({ caseId: "vc-02", decision: "approved", remarks: "All fields match." });
    expect(r).toEqual({ ok: true, id: "vc-02" });
    expect(data().instruments.find((i) => i.id === "fdr-wgce-01")!.status).toBe("verified");
    expect(data().audit.at(-1)!.action).toBe("decision.recorded");
    expect((await verifyChain(data().audit)).ok).toBe(true);
  });

  it("refuses approval while a critical finding is open", async () => {
    store().enterAs("u-ap");
    const r = await store().recordDecision({ caseId: "vc-01", decision: "approved", remarks: "x" });
    expect(r.ok).toBe(false);
  });

  it("completes a release: clearances → decision → released", async () => {
    store().enterAs("u-co");
    for (const c of data().clearances.filter((x) => x.releaseRequestId === "rr-01" && x.status === "pending")) {
      expect((await store().recordClearance({ clearanceId: c.id, outcome: "cleared", remarks: "No dues" })).ok).toBe(true);
    }
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("clearances_complete");
    expect(data().cases.find((c) => c.id === "vc-05")!.status).toBe("ready_for_decision");

    store().enterAs("u-ap");
    expect((await store().recordDecision({ caseId: "vc-05", decision: "approved", remarks: "Release." })).ok).toBe(true);
    expect(data().releaseRequests.find((r) => r.id === "rr-01")!.status).toBe("released");
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
    expect(data().instruments.find((i) => i.id === "fdr-kit-03")!.status).toBe("verified");
  });

  it("submits a release request with SIMULATED clearances", async () => {
    store().enterAs("u-owner");
    const r = await store().submitReleaseRequest({ instrumentIds: ["fdr-kit-04"], reason: "Test" });
    expect(r.ok).toBe(true);
    const rr = data().releaseRequests.at(-1)!;
    expect(rr.status).toBe("submitted");
    expect(data().clearances.filter((c) => c.releaseRequestId === rr.id)).toHaveLength(4);
  });

  it("raises a finding, requests correction, and resets the demo", async () => {
    store().enterAs("u-po");
    expect((await store().raiseFinding({ caseId: "vc-04", type: "name_mismatch", severity: "warning", description: "Beneficiary name abbreviated" })).ok).toBe(true);
    expect((await store().requestCorrection({ caseId: "vc-04", message: "Upload a corrected receipt" })).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-04")!.status).toBe("awaiting_institution");
    expect((await store().resetDemo()).ok).toBe(true);
    expect(data().cases.find((c) => c.id === "vc-04")!.status).toBe("open");
    expect(data().audit.at(-1)!.action).toBe("demo.reset");
  });

  it("detects tampering in the audit chain", async () => {
    const chain = structuredClone(data().audit);
    chain[5].summary = "Edited after the fact";
    const verdict = await verifyChain(chain);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.brokenAtSeq).toBe(chain[5].seq);
  });
});
