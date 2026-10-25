"use client";

import { useMemo } from "react";
import { CalendarClock, CalendarRange, CalendarX2, Calendar } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns } from "@/components/tables/columns";
import { daysBetween } from "@/lib/dates";
import { useDemoData, useToday } from "@/store/hooks";

export default function MaturityPage() {
  const d = useDemoData();
  const today = useToday();
  const columns = useMemo(() => instrumentColumns(d, today, { institution: true }), [d, today]);

  const inWindow = useMemo(
    () => d.instruments.filter((i) => i.status === "active" && i.maturityDate && daysBetween(today, i.maturityDate) <= 90),
    [d, today],
  );
  const band = (lo: number, hi: number) =>
    inWindow.filter((i) => {
      const n = daysBetween(today, i.maturityDate!);
      return n >= lo && n <= hi;
    }).length;

  return (
    <PortalPage
      href="/official/maturity"
      stats={
        <>
          <StatCard label="Matured, not renewed" value={band(-9999, -1)} icon={CalendarX2} tone="danger" />
          <StatCard label="0–30 days" value={band(0, 30)} icon={CalendarClock} tone="warning" />
          <StatCard label="31–60 days" value={band(31, 60)} icon={CalendarRange} />
          <StatCard label="61–90 days" value={band(61, 90)} icon={Calendar} />
        </>
      }
    >
      <DataTable columns={columns} data={inWindow} initialSorting={[{ id: "maturity", desc: false }]} pageSize={15} />
    </PortalPage>
  );
}
