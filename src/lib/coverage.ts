import type { DemoData } from "@/data/seed";
import { addDays, formatDate, todayIST } from "@/lib/dates";
import type { FinancialInstrument, ISODate, Paise, RenewalReplacement } from "@/types";

/**
 * Acceptance status and cover in force are different things.
 *
 * - The recorded STATUS says what an authorised decision accepted (e.g. Replaced / Active). It changes the moment the
 *   Approver decides.
 * - COVER IN FORCE is date-based: an accepted successor secures the obligation only from its deposit date (the
 *   replacement's recorded effective date); the replaced predecessor keeps securing it up to the day before that date,
 *   or to its own maturity if earlier.
 *
 * So between approval and the handover the predecessor (Replaced) is still in force and the successor (Active) is not
 * yet — the amount is never counted twice and there is no artificial gap. Demo assumption A1 applies: cover runs from
 * deposit date to maturity date, both inclusive, as Asia/Kolkata calendar days. Only Active and Replaced instruments
 * can provide cover; candidates under review and released instruments do not.
 */
export interface CoverPeriod {
  from: ISODate;
  /** Last day of cover (inclusive); null = no maturity (RTGS). */
  to: ISODate | null;
  /** The accepted replacement that ends this instrument's cover early, if any. */
  endedByReplacement: RenewalReplacement | null;
}

/** The replacement that accepted this instrument as a successor, if any. */
export function acceptanceOf(d: Pick<DemoData, "renewals">, instrumentId: string): RenewalReplacement | undefined {
  return d.renewals.find((r) => r.successorInstrumentId === instrumentId);
}

/** The replacement that replaced this instrument, if any. */
export function replacementOf(d: Pick<DemoData, "renewals">, instrumentId: string): RenewalReplacement | undefined {
  return d.renewals.find((r) => r.predecessorInstrumentId === instrumentId);
}

export function coverPeriod(d: Pick<DemoData, "renewals">, inst: FinancialInstrument): CoverPeriod | null {
  if (inst.status === "active") return { from: inst.issueDate, to: inst.maturityDate, endedByReplacement: null };
  if (inst.status === "replaced") {
    const rn = replacementOf(d, inst.id) ?? null;
    const dayBefore = rn ? addDays(rn.effectiveFrom, -1) : null;
    const to = dayBefore && (!inst.maturityDate || dayBefore < inst.maturityDate) ? dayBefore : inst.maturityDate;
    return { from: inst.issueDate, to, endedByReplacement: rn };
  }
  return null;
}

export function inForceOn(d: Pick<DemoData, "renewals">, inst: FinancialInstrument, day: ISODate): boolean {
  const p = coverPeriod(d, inst);
  return !!p && p.from <= day && (p.to === null || p.to >= day);
}

/** Instruments securing an obligation on a given day, and their total. */
export function coverOn(
  d: Pick<DemoData, "renewals" | "instruments">,
  obligationId: string,
  day: ISODate,
  exclude: ReadonlySet<string> = new Set(),
): { instruments: FinancialInstrument[]; paise: Paise } {
  const instruments = d.instruments.filter((i) => i.obligationId === obligationId && !exclude.has(i.id) && inForceOn(d, i, day));
  return { instruments, paise: instruments.reduce((s, i) => s + i.amountPaise, 0) };
}

/** Same, across every obligation of an institution (or all, when no institution is given). */
export function coverInForce(d: Pick<DemoData, "renewals" | "instruments">, day: ISODate, institutionId?: string): Paise {
  return d.instruments.filter((i) => (!institutionId || i.institutionId === institutionId) && inForceOn(d, i, day)).reduce((s, i) => s + i.amountPaise, 0);
}

export type CoverState = "in_force" | "not_started" | "ended" | "none";

/** Plain-language standing of an instrument today, separating acceptance from cover in force. */
export function coverStanding(d: Pick<DemoData, "renewals">, inst: FinancialInstrument, today: ISODate): { state: CoverState; label: string; detail: string | null } {
  const p = coverPeriod(d, inst);
  if (!p) return { state: "none", label: "Not providing cover", detail: null };
  const accepted = acceptanceOf(d, inst.id);
  if (p.from > today) {
    return {
      state: "not_started",
      label: `Cover starts ${formatDate(p.from)}`,
      detail: accepted ? `Accepted ${formatDate(todayIST(new Date(accepted.renewedAt)))}; effective ${formatDate(accepted.effectiveFrom)}. Until then the replaced instrument remains in force.` : null,
    };
  }
  if (p.to !== null && p.to < today) {
    return {
      state: "ended",
      label: `Cover ended ${formatDate(p.to)}`,
      detail: p.endedByReplacement ? `Replacement effective ${formatDate(p.endedByReplacement.effectiveFrom)}.` : null,
    };
  }
  return {
    state: "in_force",
    label: p.to ? `In force until ${formatDate(p.to)}` : "In force",
    detail: p.endedByReplacement
      ? `Replaced by an accepted successor effective ${formatDate(p.endedByReplacement.effectiveFrom)}; this instrument still secures the obligation until then.`
      : null,
  };
}

/**
 * Badge label when acceptance and cover differ today: an accepted successor not yet in force, or a replaced
 * instrument still in force. Undefined = the plain status label is accurate.
 */
export function acceptanceBadgeLabel(d: Pick<DemoData, "renewals">, inst: FinancialInstrument, today: ISODate): string | undefined {
  const s = coverStanding(d, inst, today);
  if (inst.status === "active" && s.state === "not_started") return `Accepted · ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}`;
  if (inst.status === "replaced" && s.state === "in_force") return `Replaced · ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}`;
  return undefined;
}
