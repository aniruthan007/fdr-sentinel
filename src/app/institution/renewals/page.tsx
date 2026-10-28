"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, CalendarX2, GitBranch, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { instrumentColumns } from "@/components/tables/columns";
import { RenewDialog } from "@/components/institution/institution-dialogs";
import { LineageChain } from "@/components/institution/lineage-chain";
import { lineage, renewalInProgress } from "@/lib/institution";
import { instrumentDisplayStatus } from "@/lib/status";
import { useCan } from "@/hooks/use-command";
import { useDemoData, useSession, useToday } from "@/store/hooks";
import type { FinancialInstrument } from "@/types";

const hrefFor = (i: { id: string }) => `/institution/deposits/${i.id}`;

export default function RenewalsPage() {
  const d = useDemoData();
  const router = useRouter();
  const session = useSession();
  const today = useToday();
  const instId = session?.institutionId;
  const canRenew = useCan("renewInstrument", instId);

  const mine = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const dated = useMemo(() => mine.filter((i) => i.maturityDate && i.status === "active"), [mine]);
  const near = dated.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length;
  const matured = dated.filter((i) => instrumentDisplayStatus(i, today) === "matured").length;
  const inProgress = mine.filter((i) => i.predecessorInstrumentId && !["active", "replaced", "rejected", "archived", "released"].includes(i.status));
  // One chain per deposit that has been renewed at least once, keyed by its first generation.
  const chains = useMemo(() => {
    const seen = new Set<string>();
    return mine
      .map((i) => lineage(d, i.id))
      .filter((c) => c.length > 1 && !seen.has(c[0].id) && seen.add(c[0].id));
  }, [d, mine]);

  const columns = useMemo<ColumnDef<FinancialInstrument>[]>(
    () => [
      ...instrumentColumns(d, today, { href: hrefFor }),
      {
        id: "renew",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: i } }) => {
          const renewing = renewalInProgress(d, i.id);
          if (renewing) return <span className="text-xs text-muted-foreground">Replacement under review</span>;
          if (!canRenew) return null;
          const urgent = ["near_maturity", "matured"].includes(instrumentDisplayStatus(i, today));
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <RenewDialog instrument={i} trigger={<Button size="xs" variant={urgent ? "default" : "outline"} className="gap-1"><RefreshCcw className="size-3" /> Renew / replace</Button>} />
            </div>
          );
        },
      },
    ],
    [d, today, canRenew],
  );

  return (
    <PortalPage
      href="/institution/renewals"
      stats={
        <>
          <StatCard label="Near maturity" value={near} hint="Within 30 days" icon={CalendarClock} tone={near ? "warning" : "default"} />
          <StatCard label="Matured, no recorded successor" value={matured} hint="Review required" icon={CalendarX2} tone={matured ? "danger" : "default"} />
          <StatCard label="Renewals under review" value={inProgress.length} icon={RefreshCcw} />
          <StatCard label="Renewal chains" value={chains.length} hint="Predecessor ↔ successor links" icon={GitBranch} />
        </>
      }
    >
      <Section title="Upcoming maturities">
        <DataTable columns={columns} data={dated} initialSorting={[{ id: "maturity", desc: false }]} onRowClick={(i) => router.push(hrefFor(i))} />
      </Section>

      {inProgress.length > 0 && (
        <Section title="Renewals under review">
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
            {inProgress.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => router.push(hrefFor(i))} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[13px]">{i.instrumentNo}</span>
                    <span className="text-xs text-muted-foreground">Renews {d.instruments.find((p) => p.id === i.predecessorInstrumentId)?.instrumentNo}</span>
                  </span>
                  <StatusBadge status={i.status} className="h-5 text-[11px]" noHint />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Renewal lineage">
        <div className="space-y-4">
          {chains.map((chain) => (
            <div key={chain[0].id} className="rounded-xl border bg-card p-4 shadow-soft">
              <LineageChain chain={chain} data={d} today={today} hrefFor={hrefFor} />
            </div>
          ))}
          {chains.length === 0 && <p className="text-sm text-muted-foreground">No renewals yet.</p>}
        </div>
      </Section>
    </PortalPage>
  );
}
