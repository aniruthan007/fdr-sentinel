"use client";

import { useMemo } from "react";
import { FileStack, Landmark, TriangleAlert, CalendarClock } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns } from "@/components/tables/columns";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoData, useToday } from "@/store/hooks";

export default function InstrumentsPage() {
  const d = useDemoData();
  const today = useToday();
  const columns = useMemo(() => instrumentColumns(d, today, { institution: true }), [d, today]);
  const verified = d.instruments.filter((i) => i.status === "verified");

  return (
    <PortalPage
      href="/official/instruments"
      stats={
        <>
          <StatCard label="Instruments" value={d.instruments.length} hint="FDR · RPGF · RTGS, with history" icon={FileStack} />
          <StatCard label="Verified value" value={<MoneyText paise={verified.reduce((s, i) => s + i.amountPaise, 0)} compact />} hint={`${verified.length} verified`} icon={Landmark} />
          <StatCard label="Discrepancies" value={d.instruments.filter((i) => i.status === "discrepancy").length} icon={TriangleAlert} tone="danger" />
          <StatCard label="Near maturity" value={d.instruments.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length} icon={CalendarClock} tone="warning" />
        </>
      }
    >
      <DataTable columns={columns} data={d.instruments} searchPlaceholder="Search instrument, bank or institution" initialSorting={[{ id: "maturity", desc: false }]} />
    </PortalPage>
  );
}
