"use client";

import { useMemo } from "react";
import { CheckCircle2, Hourglass, ShieldCheck, Undo2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { releaseColumns } from "@/components/tables/columns";
import { useDemoData, useSession } from "@/store/hooks";

export default function InstitutionReleasesPage() {
  const d = useDemoData();
  const session = useSession();
  const instId = session?.institutionId;

  const requests = useMemo(() => d.releaseRequests.filter((r) => r.institutionId === instId), [d, instId]);
  const open = requests.filter((r) => !["released", "rejected"].includes(r.status));
  const ids = new Set(requests.map((r) => r.id));
  const pending = d.clearances.filter((c) => ids.has(c.releaseRequestId) && c.status === "pending").length;
  const columns = useMemo(() => releaseColumns(d, { institution: false }), [d]);

  return (
    <PortalPage
      href="/institution/releases"
      stats={
        <>
          <StatCard label="Open requests" value={open.length} icon={Undo2} />
          <StatCard label="Amount in release" value={<MoneyText paise={open.reduce((s, r) => s + r.totalPaise, 0)} compact />} icon={Hourglass} />
          <StatCard label="Clearances pending" value={pending} hint="Across open requests" icon={ShieldCheck} tone={pending ? "warning" : "default"} />
          <StatCard label="Released" value={requests.filter((r) => r.status === "released").length} icon={CheckCircle2} tone="success" />
        </>
      }
    >
      <DataTable
        columns={columns}
        data={requests}
        emptyTitle="No release requests yet"
        emptyDescription="When a deposit is no longer needed you can request its release here."
      />
    </PortalPage>
  );
}
