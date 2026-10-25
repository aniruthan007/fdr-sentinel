"use client";

import { useMemo } from "react";
import { CheckCircle2, Hourglass, OctagonAlert, PlugZap } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { clearanceColumns } from "@/components/tables/columns";
import { useDemoData } from "@/store/hooks";

export default function ClearancesPage() {
  const d = useDemoData();
  const columns = useMemo(() => clearanceColumns(d), [d]);
  const count = (s: string) => d.clearances.filter((c) => c.status === s).length;

  return (
    <PortalPage
      href="/official/clearances"
      stats={
        <>
          <StatCard label="Pending" value={count("pending")} icon={Hourglass} tone={count("pending") ? "warning" : "default"} />
          <StatCard label="Cleared" value={count("cleared")} icon={CheckCircle2} tone="success" />
          <StatCard label="Objections" value={count("objection")} icon={OctagonAlert} tone={count("objection") ? "danger" : "default"} />
          <StatCard label="Department adapters" value="4" hint="All SIMULATED in this prototype" icon={PlugZap} />
        </>
      }
    >
      <DataTable columns={columns} data={d.clearances} searchPlaceholder="Search request, institution or department" />
    </PortalPage>
  );
}
