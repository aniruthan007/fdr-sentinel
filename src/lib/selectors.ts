import type { DemoData } from "@/data/seed";
import type { ReleaseRequest, ReleaseStatus } from "@/types";

/** Release states with no further processing (brief §7.3). */
const SETTLED_RELEASE: ReadonlySet<ReleaseStatus> = new Set(["approved", "rejected", "returned", "closed"]);

export function isOpenRelease(r: ReleaseRequest): boolean {
  return !SETTLED_RELEASE.has(r.status);
}

/** Approved by a recorded authorised decision (the request may since have been closed). */
export function isReleaseApproved(d: DemoData, r: ReleaseRequest): boolean {
  return d.cases.find((c) => c.id === r.caseId)?.decision?.outcome === "approved";
}

/** Instruments on cases with unresolved findings — "flagged for review", never "fraud". */
export function flaggedInstrumentIds(d: DemoData): Set<string> {
  const caseIds = new Set(d.findings.filter((f) => f.status !== "resolved").map((f) => f.caseId));
  return new Set(d.cases.filter((c) => caseIds.has(c.id)).flatMap((c) => c.instrumentIds));
}
