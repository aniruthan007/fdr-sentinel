import type { DemoData } from "@/data/seed";
import type { FinancialInstrument, VerificationCase } from "@/types";

/** The most recent case that covers an instrument. */
export function latestCaseFor(d: DemoData, instrumentId: string): VerificationCase | undefined {
  return d.cases.filter((c) => c.instrumentIds.includes(instrumentId)).sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
}

/** Every generation of an instrument, oldest first: walk predecessors up, then successors down. */
export function lineage(d: DemoData, instrumentId: string): FinancialInstrument[] {
  const byId = new Map(d.instruments.map((i) => [i.id, i]));
  let root = byId.get(instrumentId);
  const seen = new Set<string>();
  while (root?.predecessorInstrumentId && !seen.has(root.id)) {
    seen.add(root.id);
    root = byId.get(root.predecessorInstrumentId);
  }
  const chain: FinancialInstrument[] = [];
  let cur = root;
  while (cur && !chain.includes(cur)) {
    chain.push(cur);
    cur = d.instruments.find((i) => i.predecessorInstrumentId === cur!.id && i.status !== "rejected");
  }
  return chain;
}

/** A successor submitted but not yet decided. */
export function renewalInProgress(d: DemoData, instrumentId: string): FinancialInstrument | undefined {
  return d.instruments.find((i) => i.predecessorInstrumentId === instrumentId && !["rejected", "archived"].includes(i.status) && i.status !== "active");
}

/** The officer's most recent correction request on a case, as written. */
export function correctionMessage(d: DemoData, caseId: string): string | null {
  const ev = [...d.audit].reverse().find((e) => e.entityId === caseId && e.action === "correction.requested");
  if (!ev) return null;
  const i = ev.summary.indexOf(": ");
  return i >= 0 ? ev.summary.slice(i + 2) : ev.summary;
}
