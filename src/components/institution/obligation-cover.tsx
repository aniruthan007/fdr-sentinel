"use client";

import { cn } from "@/lib/utils";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS } from "@/components/tables/columns";
import { DateText } from "@/components/date-text";
import { coverOn } from "@/lib/coverage";
import { useToday } from "@/store/hooks";
import type { DemoData } from "@/data/seed";
import type { DepositObligation } from "@/types";

/** Required amount vs cover IN FORCE TODAY for one obligation (not acceptance status — see src/lib/coverage.ts). */
export function ObligationCover({ data, obligation }: { data: DemoData; obligation: DepositObligation }) {
  const today = useToday();
  const insts = data.instruments.filter((i) => i.obligationId === obligation.id);
  const active = coverOn(data, obligation.id, today).paise;
  // Accepted successors whose effective date is still ahead: not counted until then.
  const upcoming = insts.filter((i) => i.status === "active" && i.issueDate > today);
  const pending = insts.filter((i) => ["submitted", "under_review", "needs_correction", "verified"].includes(i.status)).reduce((s, i) => s + i.amountPaise, 0);
  const pct = obligation.requiredPaise ? Math.min(100, Math.round((active / obligation.requiredPaise) * 100)) : 0;
  const pendingPct = obligation.requiredPaise ? Math.min(100 - pct, Math.round((pending / obligation.requiredPaise) * 100)) : 0;
  const discharged = obligation.status === "discharged";

  return (
    <div className="rounded-lg border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{OBLIGATION_KIND_LABELS[obligation.kind]}</p>
          <p className="text-xs text-muted-foreground">AY {obligation.academicYear}</p>
        </div>
        <StatusBadge status={obligation.status} className="h-5 text-[11px]" />
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct}% covered by instruments in force today`}>
        <span className={cn("h-full", discharged ? "bg-muted-foreground/40" : "bg-status-success")} style={{ width: `${discharged ? 100 : pct}%` }} />
        <span className="h-full bg-primary/35" style={{ width: `${discharged ? 0 : pendingPct}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
        <span>
          <MoneyText paise={active} compact className="text-foreground" /> in force today of <MoneyText paise={obligation.requiredPaise} compact />
        </span>
        {upcoming.map((i) => (
          <span key={i.id} className="basis-full">
            Accepted replacement <span className="font-mono">{i.instrumentNo}</span> takes effect <DateText date={i.issueDate} />
          </span>
        ))}
        {pending > 0 && !discharged && (
          <span>
            <MoneyText paise={pending} compact /> under review
          </span>
        )}
      </p>
    </div>
  );
}
