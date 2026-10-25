"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, Landmark, Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { instrumentColumns } from "@/components/tables/columns";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoData, useSession, useToday } from "@/store/hooks";

export default function InstitutionOverviewPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const instId = session?.institutionId;

  const mine = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const live = useMemo(() => mine.filter((i) => i.status !== "renewed" && i.status !== "released"), [mine]);
  const secured = mine.filter((i) => i.status === "verified").reduce((s, i) => s + i.amountPaise, 0);
  const issues = d.cases.filter(
    (c) =>
      c.institutionId === instId &&
      !["approved", "rejected", "closed"].includes(c.status) &&
      (c.status === "awaiting_institution" || d.findings.some((f) => f.caseId === c.id && f.status !== "resolved")),
  ).length;
  const maturing = mine.filter((i) => ["near_maturity", "matured"].includes(instrumentDisplayStatus(i, today))).length;
  const openReleases = d.releaseRequests.filter((r) => r.institutionId === instId && !["released", "rejected"].includes(r.status)).length;
  const columns = useMemo(() => instrumentColumns(d, today), [d, today]);

  return (
    <PortalPage
      href="/institution"
      stats={
        <>
          <StatCard label="Verified deposit cover" value={<MoneyText paise={secured} compact />} hint={`${live.length} live instruments`} icon={Landmark} href="/institution/deposits" />
          <StatCard label="Needs your attention" value={issues} hint="Cases with open findings" icon={AlertTriangle} tone={issues ? "danger" : "default"} href="/institution/deposits" />
          <StatCard label="Maturing ≤ 30 days" value={maturing} hint="Renew before maturity" icon={CalendarClock} tone={maturing ? "warning" : "default"} href="/institution/renewals" />
          <StatCard label="Open release requests" value={openReleases} hint="Awaiting clearances or decision" icon={Undo2} href="/institution/releases" />
        </>
      }
    >
      <Section title="Live instruments">
        <DataTable columns={columns} data={live} initialSorting={[{ id: "maturity", desc: false }]} />
      </Section>
    </PortalPage>
  );
}
