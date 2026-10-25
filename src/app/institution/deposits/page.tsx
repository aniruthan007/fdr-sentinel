"use client";

import { useMemo } from "react";
import { CircleDollarSign, FileStack, ShieldCheck, TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns, obligationColumns } from "@/components/tables/columns";
import { flaggedInstrumentIds } from "@/lib/selectors";
import { useDemoData, useSession, useToday } from "@/store/hooks";

export default function DepositRegisterPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const instId = session?.institutionId;

  const obligations = useMemo(() => d.obligations.filter((o) => o.institutionId === instId), [d, instId]);
  const instruments = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const required = obligations.filter((o) => o.status !== "discharged").reduce((s, o) => s + o.requiredPaise, 0);
  const secured = obligations.filter((o) => o.status === "secured").length;
  const flaggedIds = flaggedInstrumentIds(d);
  const flagged = instruments.filter((i) => flaggedIds.has(i.id)).length;
  const obCols = useMemo(() => obligationColumns(d), [d]);
  const instCols = useMemo(() => instrumentColumns(d, today), [d, today]);

  return (
    <PortalPage
      href="/institution/deposits"
      stats={
        <>
          <StatCard label="Obligations" value={obligations.length} hint={`${secured} fully secured`} icon={ShieldCheck} />
          <StatCard label="Total required" value={<MoneyText paise={required} compact />} hint="Excludes discharged" icon={CircleDollarSign} />
          <StatCard label="Instruments on record" value={instruments.length} hint="Including renewal history" icon={FileStack} />
          <StatCard label="Flagged for review" value={flagged} hint="Declared and document values differ" icon={TriangleAlert} tone={flagged ? "warning" : "default"} />
        </>
      }
    >
      <Section title="Obligations">
        <DataTable columns={obCols} data={obligations} />
      </Section>
      <Section title="All instruments">
        <DataTable columns={instCols} data={instruments} searchPlaceholder="Search instrument no. or bank" />
      </Section>
    </PortalPage>
  );
}
