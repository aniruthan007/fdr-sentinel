"use client";

import { useMemo } from "react";
import { CircleDot, Gavel, Hourglass, TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { caseColumns } from "@/components/tables/columns";
import { useDemoData } from "@/store/hooks";

export default function CasesPage() {
  const d = useDemoData();
  const columns = useMemo(() => caseColumns(d), [d]);
  const count = (s: string) => d.cases.filter((c) => c.status === s).length;
  const openFindings = d.findings.filter((f) => f.status !== "resolved").length;

  return (
    <PortalPage
      href="/official/cases"
      stats={
        <>
          <StatCard label="Open / in review" value={count("open") + count("in_review")} icon={CircleDot} />
          <StatCard label="Awaiting institution" value={count("awaiting_institution")} icon={Hourglass} tone="warning" />
          <StatCard label="Ready for authorised decision" value={count("ready_for_decision")} icon={Gavel} />
          <StatCard label="Unresolved findings" value={openFindings} icon={TriangleAlert} tone={openFindings ? "danger" : "default"} />
        </>
      }
    >
      <DataTable columns={columns} data={d.cases} searchPlaceholder="Search case ref, title or institution" initialSorting={[{ id: "updated", desc: true }]} />
    </PortalPage>
  );
}
