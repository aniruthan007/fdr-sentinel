"use client";

import { useMemo } from "react";
import { CheckCircle2, Hourglass, ShieldCheck, Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { releaseColumns } from "@/components/tables/columns";
import { isOpenRelease, isReleaseApproved } from "@/lib/selectors";
import { useDemoData } from "@/store/hooks";

export default function OfficialReleasesPage() {
  const d = useDemoData();
  const columns = useMemo(() => releaseColumns(d), [d]);
  const open = d.releaseRequests.filter(isOpenRelease);

  return (
    <PortalPage
      href="/official/releases"
      stats={
        <>
          <StatCard label="Open requests" value={open.length} icon={Undo2} />
          <StatCard label="Amount under review" value={<MoneyText paise={open.reduce((s, r) => s + r.totalPaise, 0)} compact />} icon={Hourglass} />
          <StatCard label="Awaiting clearance(s)" value={d.releaseRequests.filter((r) => r.status === "awaiting_clearances").length} icon={ShieldCheck} tone="warning" />
          <StatCard label="Approved" value={d.releaseRequests.filter((r) => isReleaseApproved(d, r)).length} icon={CheckCircle2} tone="success" />
        </>
      }
    >
      <DataTable columns={columns} data={d.releaseRequests} searchPlaceholder="Search request or institution" initialSorting={[{ id: "submitted", desc: true }]} />
    </PortalPage>
  );
}
