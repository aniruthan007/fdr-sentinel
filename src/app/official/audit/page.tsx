"use client";

import { useMemo } from "react";
import { Hash, Link2, ScrollText, Users } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { IdText } from "@/components/id-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { auditColumns } from "@/components/tables/columns";
import { useDemoData } from "@/store/hooks";

export default function AuditPage() {
  const d = useDemoData();
  const columns = useMemo(() => auditColumns(), []);
  const head = d.audit[d.audit.length - 1];

  return (
    <PortalPage
      href="/official/audit"
      stats={
        <>
          <StatCard label="Events" value={d.audit.length} icon={ScrollText} />
          <StatCard label="Distinct actors" value={new Set(d.audit.map((e) => e.actorId)).size} icon={Users} />
          <StatCard label="Chain algorithm" value="SHA-256" hint="Web Crypto, prev-hash linked" icon={Link2} />
          <StatCard label="Chain head" value={head ? <IdText value={head.hash} truncate={10} className="text-base" /> : "—"} hint={head ? `Event #${head.seq}` : undefined} icon={Hash} />
        </>
      }
    >
      <DataTable columns={columns} data={d.audit} searchPlaceholder="Search actor, action or summary" initialSorting={[{ id: "seq", desc: true }]} pageSize={15} />
    </PortalPage>
  );
}
