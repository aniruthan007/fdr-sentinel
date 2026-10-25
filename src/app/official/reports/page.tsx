"use client";

import { useMemo } from "react";
import { Percent, Landmark, Timer, Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { institutionColumns } from "@/components/tables/columns";
import { isReleaseApproved } from "@/lib/selectors";
import { useDemoData } from "@/store/hooks";

export default function ReportsPage() {
  const d = useDemoData();
  const columns = useMemo(() => institutionColumns(d), [d]);
  const required = d.obligations.filter((o) => o.status !== "discharged").reduce((s, o) => s + o.requiredPaise, 0);
  const covered = d.instruments.filter((i) => i.status === "active").reduce((s, i) => s + i.amountPaise, 0);
  const coverage = required ? Math.round((covered / required) * 1000) / 10 : 0;
  const released = d.releaseRequests.filter((r) => isReleaseApproved(d, r) && r.decidedAt);
  const avgDays = released.length
    ? Math.round(released.reduce((s, r) => s + (Date.parse(r.decidedAt!) - Date.parse(r.submittedAt)) / 86_400_000, 0) / released.length)
    : null;

  return (
    <PortalPage
      href="/official/reports"
      stats={
        <>
          <StatCard label="Coverage" value={`${coverage}%`} hint="Active cover ÷ required" icon={Percent} />
          <StatCard label="Active cover" value={<MoneyText paise={covered} compact />} icon={Landmark} />
          <StatCard label="Approved for release" value={<MoneyText paise={released.reduce((s, r) => s + r.totalPaise, 0)} compact />} hint={`${released.length} request(s)`} icon={Undo2} />
          <StatCard label="Avg. release turnaround" value={avgDays === null ? "—" : `${avgDays} d`} hint="Submission → decision" icon={Timer} />
        </>
      }
    >
      <Section title="Coverage by institution">
        <DataTable columns={columns} data={d.institutions} />
      </Section>
    </PortalPage>
  );
}
