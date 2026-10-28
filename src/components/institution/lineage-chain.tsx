"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateText } from "@/components/date-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { instrumentDisplayStatus } from "@/lib/status";
import { acceptanceBadgeLabel, acceptanceOf, coverPeriod } from "@/lib/coverage";
import type { DemoData } from "@/data/seed";
import type { FinancialInstrument, ISODate } from "@/types";

/** Cover period actually in force, and the recorded effective date of the replacement that started it. */
function CoverLine({ data, inst }: { data: Pick<DemoData, "renewals">; inst: FinancialInstrument }) {
  const p = coverPeriod(data, inst);
  const accepted = acceptanceOf(data, inst.id);
  if (!p && !accepted) return null;
  return (
    <p className="mt-0.5 text-[11px] text-muted-foreground">
      {p && (
        <>
          Cover <DateText date={p.from} /> – {p.to ? <DateText date={p.to} /> : "open"}
        </>
      )}
      {accepted && (
        <span className="block">
          Effective <DateText date={accepted.effectiveFrom} />
        </span>
      )}
    </p>
  );
}

/** Generations of one deposit, oldest first. History is linked, never overwritten. */
export function LineageChain({ chain, data, currentId, today, hrefFor }: { chain: FinancialInstrument[]; data: Pick<DemoData, "renewals">; currentId?: string; today: ISODate; hrefFor?: (i: FinancialInstrument) => string }) {
  return (
    <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0" aria-label="Renewal lineage">
      {chain.map((inst, i) => {
        const current = inst.id === currentId;
        const body = (
          <div
            className={cn(
              "h-full min-w-0 rounded-lg border bg-card px-3 py-2.5 transition-colors",
              current ? "border-primary/50 ring-2 ring-primary/15" : hrefFor && "hover:border-primary/30",
            )}
          >
            <p className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              Generation {i + 1}
              <StatusBadge status={instrumentDisplayStatus(inst, today)} label={acceptanceBadgeLabel(data, inst, today)} className="h-5 text-[10px]" noHint />
            </p>
            <p className="mt-1 truncate font-mono text-[13px]">{inst.instrumentNo}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <MoneyText paise={inst.amountPaise} compact />
              <span>
                <DateText date={inst.issueDate} /> → <DateText date={inst.maturityDate} />
              </span>
            </p>
            <CoverLine data={data} inst={inst} />
          </div>
        );
        return (
          <li key={inst.id} className="flex min-w-0 flex-col md:flex-1 md:flex-row md:items-center">
            {hrefFor && !current ? (
              <Link href={hrefFor(inst)} className="block min-w-0 flex-1">
                {body}
              </Link>
            ) : (
              <div className="min-w-0 flex-1" aria-current={current ? "true" : undefined}>
                {body}
              </div>
            )}
            {i < chain.length - 1 && (
              <ChevronRight className="mx-auto my-0.5 size-4 shrink-0 rotate-90 text-muted-foreground md:mx-1 md:my-0 md:rotate-0" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
