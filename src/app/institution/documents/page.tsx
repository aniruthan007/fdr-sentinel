"use client";

import { useMemo } from "react";
import { FileCheck2, FileClock, FileText, ScanSearch } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { documentColumns } from "@/components/tables/columns";
import { useDemoData, useSession } from "@/store/hooks";

export default function DocumentsPage() {
  const d = useDemoData();
  const session = useSession();
  const instId = session?.institutionId;

  const docs = useMemo(() => d.documents.filter((x) => x.institutionId === instId), [d, instId]);
  const docIds = new Set(docs.map((x) => x.id));
  const fields = d.extractions.filter((e) => docIds.has(e.documentId));
  const columns = useMemo(() => documentColumns(d), [d]);

  return (
    <PortalPage
      href="/institution/documents"
      stats={
        <>
          <StatCard label="Documents" value={docs.length} icon={FileText} />
          <StatCard label="Awaiting confirmation" value={docs.filter((x) => x.status === "extracted").length} hint="Extracted fields to check" icon={FileClock} tone="warning" />
          <StatCard label="Confirmed" value={docs.filter((x) => x.status === "confirmed").length} icon={FileCheck2} tone="success" />
          <StatCard label="Extracted fields" value={fields.length} hint={`${fields.filter((e) => e.confirmedAt).length} confirmed by a person`} icon={ScanSearch} />
        </>
      }
    >
      <DataTable columns={columns} data={docs} searchPlaceholder="Search documents" initialSorting={[{ id: "uploaded", desc: true }]} />
    </PortalPage>
  );
}
