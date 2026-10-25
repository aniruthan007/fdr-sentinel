"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ClearanceDialog } from "@/components/official/action-dialogs";
import { CheckCircle2, Hourglass, OctagonAlert, PlugZap } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { clearanceColumns } from "@/components/tables/columns";
import { useDemoData, useSession } from "@/store/hooks";

export default function ClearancesPage() {
  const d = useDemoData();
  const session = useSession();
  // The assigned clearance officer records outcomes here; other roles only read.
  const columns = useMemo(
    () =>
      clearanceColumns(d, (c) =>
        session?.role === "clearance_officer" && c.assignedTo === session.userId && ["pending", "further_info_required", "error_unavailable"].includes(c.status) ? (
          <ClearanceDialog clearance={c} requestRef={d.releaseRequests.find((r) => r.id === c.releaseRequestId)?.ref ?? ""} trigger={<Button size="xs">Record</Button>} />
        ) : null,
      ),
    [d, session],
  );
  // Brief §2.1: a clearance officer sees only clearances assigned to them.
  const visible = useMemo(
    () => (session?.role === "clearance_officer" ? d.clearances.filter((c) => c.assignedTo === session.userId) : d.clearances),
    [d, session],
  );
  const count = (...s: string[]) => visible.filter((c) => s.includes(c.status)).length;

  return (
    <PortalPage
      href="/official/clearances"
      stats={
        <>
          <StatCard label="Pending / further info" value={count("pending", "further_info_required")} icon={Hourglass} tone={count("pending", "further_info_required") ? "warning" : "default"} />
          <StatCard label="Cleared" value={count("cleared")} icon={CheckCircle2} tone="success" />
          <StatCard label="Not cleared / error" value={count("not_cleared", "error_unavailable")} icon={OctagonAlert} tone={count("not_cleared", "error_unavailable") ? "danger" : "default"} />
          <StatCard label="Department adapters" value="4" hint="All SIMULATED in this prototype" icon={PlugZap} />
        </>
      }
    >
      <DataTable columns={columns} data={visible} searchPlaceholder="Search request, institution or department" />
    </PortalPage>
  );
}
