"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FileStack, Landmark, TriangleAlert, CalendarClock } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns } from "@/components/tables/columns";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoData, useToday } from "@/store/hooks";

/** Supports ?q= deep links from the ⌘K palette. */
export default function InstrumentsPage() {
  return (
    <Suspense>
      <InstrumentsPageInner />
    </Suspense>
  );
}

function InstrumentsPageInner() {
  const q = useSearchParams().get("q") ?? "";
  const d = useDemoData();
  const today = useToday();
  const columns = useMemo(() => instrumentColumns(d, today, { institution: true }), [d, today]);
  const active = d.instruments.filter((i) => i.status === "active");

  return (
    <PortalPage
      href="/official/instruments"
      stats={
        <>
          <StatCard label="Instruments" value={d.instruments.length} hint="FDR · RPGF · RTGS, with history" icon={FileStack} />
          <StatCard label="Active value" value={<MoneyText paise={active.reduce((s, i) => s + i.amountPaise, 0)} compact />} hint={`${active.length} active`} icon={Landmark} />
          <StatCard label="Needs correction" value={d.instruments.filter((i) => i.status === "needs_correction").length} icon={TriangleAlert} tone="warning" />
          <StatCard label="Near maturity" value={d.instruments.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length} icon={CalendarClock} tone="warning" />
        </>
      }
    >
      <DataTable key={q} initialFilter={q} columns={columns} data={d.instruments} searchPlaceholder="Search instrument, bank or institution" initialSorting={[{ id: "maturity", desc: false }]} />
    </PortalPage>
  );
}
