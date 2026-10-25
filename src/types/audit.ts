import type { Role } from "./auth";
import type { EntityType, ISOTimestamp } from "./domain";

export type AuditPayload = Record<string, string | number | boolean | null>;

/** The fields covered by the hash. Everything an auditor needs to re-derive it. */
export interface AuditEventBody {
  seq: number;
  id: string;
  at: ISOTimestamp;
  actorId: string;
  actorName: string;
  actorRole: Role | "system";
  action: string;
  entityType: EntityType;
  entityId: string;
  institutionId: string | null;
  summary: string;
  payload: AuditPayload;
}

/** An append-only, SHA-256 hash-chained audit row (mirrors `audit_events`). */
export interface AuditEvent extends AuditEventBody {
  /** Hash of the previous event; the genesis event uses 64 zeros. */
  prevHash: string;
  /** SHA-256 over the canonical JSON of the body plus `prevHash`. */
  hash: string;
}

/** An audit event before it has been sealed into the chain. */
export type AuditDraft = Omit<AuditEventBody, "seq" | "id"> & { id?: string };
