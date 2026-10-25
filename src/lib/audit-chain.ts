import type { AuditDraft, AuditEvent, AuditEventBody } from "@/types";

export const GENESIS_HASH = "0".repeat(64);

/** Deterministic JSON: object keys sorted at every depth, so the same event always hashes the same. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`).join(",")}}`;
}

/** SHA-256 via Web Crypto (browser and Node ≥ 19 both expose `crypto.subtle`). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function bodyOf(event: AuditEvent): AuditEventBody {
  const { prevHash: _prev, hash: _hash, ...body } = event;
  void _prev;
  void _hash;
  return body;
}

export async function hashEvent(body: AuditEventBody, prevHash: string): Promise<string> {
  return sha256Hex(canonicalJSON({ ...body, prevHash }));
}

/** Seals a draft onto the end of a chain. Pure: returns the new event, does not mutate. */
export async function sealEvent(
  draft: AuditDraft,
  previous: AuditEvent | undefined,
): Promise<AuditEvent> {
  const seq = previous ? previous.seq + 1 : 1;
  const body: AuditEventBody = {
    ...draft,
    seq,
    id: draft.id ?? `aud-${String(seq).padStart(5, "0")}`,
  };
  const prevHash = previous?.hash ?? GENESIS_HASH;
  return { ...body, prevHash, hash: await hashEvent(body, prevHash) };
}

export async function sealChain(drafts: AuditDraft[]): Promise<AuditEvent[]> {
  const out: AuditEvent[] = [];
  for (const draft of drafts) out.push(await sealEvent(draft, out[out.length - 1]));
  return out;
}

export type ChainVerdict =
  | { ok: true; checked: number }
  | { ok: false; checked: number; brokenAtSeq: number; reason: "hash_mismatch" | "link_mismatch" };

/** Recomputes every hash and link. The first event whose stored hash disagrees is where tampering starts. */
export async function verifyChain(events: AuditEvent[]): Promise<ChainVerdict> {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.prevHash !== prevHash) {
      return { ok: false, checked: i, brokenAtSeq: event.seq, reason: "link_mismatch" };
    }
    const expected = await hashEvent(bodyOf(event), event.prevHash);
    if (expected !== event.hash) {
      return { ok: false, checked: i, brokenAtSeq: event.seq, reason: "hash_mismatch" };
    }
    prevHash = event.hash;
  }
  return { ok: true, checked: events.length };
}
