"use client";

import { useMemo } from "react";
import { CalendarClock, CalendarX2, GitBranch, RefreshCcw } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns } from "@/components/tables/columns";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoData, useSession, useToday } from "@/store/hooks";

export default function RenewalsPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const instId = session?.institutionId;

  const mine = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const dated = useMemo(() => mine.filter((i) => i.maturityDate && i.status === "active"), [mine]);
  const near = dated.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length;
  const matured = dated.filter((i) => instrumentDisplayStatus(i, today) === "matured").length;
  const renewals = d.renewals.filter((r) => r.institutionId === instId);
  const lineage = useMemo(
    () => mine.filter((i) => i.predecessorInstrumentId || mine.some((m) => m.predecessorInstrumentId === i.id)),
    [mine],
  );
  const columns = useMemo(() => instrumentColumns(d, today), [d, today]);

  return (
    <PortalPage
      href="/institution/renewals"
      stats={
        <>
          <StatCard label="Near maturity" value={near} hint="Within 30 days" icon={CalendarClock} tone={near ? "warning" : "default"} />
          <StatCard label="Matured, not renewed" value={matured} icon={CalendarX2} tone={matured ? "danger" : "default"} />
          <StatCard label="Renewals recorded" value={renewals.length} icon={RefreshCcw} />
          <StatCard label="Instruments in lineage" value={lineage.length} hint="Predecessor ↔ successor links" icon={GitBranch} />
        </>
      }
    >
      <Section title="Upcoming maturities">
        <DataTable columns={columns} data={dated} initialSorting={[{ id: "maturity", desc: false }]} />
      </Section>
      <Section title="Renewal lineage">
        <DataTable columns={columns} data={lineage} initialSorting={[{ id: "maturity", desc: true }]} />
      </Section>
    </PortalPage>
  );
}
