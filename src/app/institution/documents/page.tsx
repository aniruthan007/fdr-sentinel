"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileCheck2, FileClock, FileText, ScanSearch, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/data-table";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { documentColumns } from "@/components/tables/columns";
import { EvidenceViewer } from "@/components/official/evidence-viewer";
import { UploadDocumentDialog } from "@/components/institution/institution-dialogs";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { useCan } from "@/hooks/use-command";
import { useDemoData, useSession } from "@/store/hooks";
import type { ExtractionField } from "@/types";

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentCentre />
    </Suspense>
  );
}

function DocumentCentre() {
  const d = useDemoData();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const instId = session?.institutionId;
  const canUpload = useCan("uploadDocument", instId);
  const [activeField, setActiveField] = useState<ExtractionField | null>(null);

  const docs = useMemo(() => d.documents.filter((x) => x.institutionId === instId), [d, instId]);
  const instruments = useMemo(() => d.instruments.filter((i) => i.institutionId === instId && !["replaced", "released", "archived"].includes(i.status)), [d, instId]);
  const docIds = new Set(docs.map((x) => x.id));
  const fields = d.extractions.filter((e) => docIds.has(e.documentId));
  const columns = useMemo(() => documentColumns(d), [d]);

  const openId = params.get("doc");
  const open = docs.find((x) => x.id === openId);
  const setOpen = (id: string | null) => router.replace(id ? `/institution/documents?doc=${id}` : "/institution/documents", { scroll: false });

  return (
    <PortalPage
      href="/institution/documents"
      actions={
        canUpload &&
        instId && (
          <UploadDocumentDialog institutionId={instId} instruments={instruments} trigger={<Button size="sm" className="gap-1.5"><Upload className="size-3.5" /> Upload document</Button>} />
        )
      }
      stats={
        <>
          <StatCard label="Documents" value={docs.length} icon={FileText} />
          <StatCard label="Awaiting your confirmation" value={docs.filter((x) => x.status === "extracted").length} hint="Extracted fields to check" icon={FileClock} tone="warning" />
          <StatCard label="Confirmed" value={docs.filter((x) => x.status === "confirmed").length} icon={FileCheck2} tone="success" />
          <StatCard label="Extracted fields" value={fields.length} hint={`${fields.filter((e) => e.confirmedAt).length} confirmed by a person`} icon={ScanSearch} />
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Open a document to see where each extracted value was read from. Confirming a field records that you checked it; only an officer can verify a deposit.
      </p>
      <DataTable columns={columns} data={docs} searchPlaceholder="Search documents" initialSorting={[{ id: "uploaded", desc: true }]} onRowClick={(doc) => setOpen(doc.id)} />

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{DOCUMENT_KIND_LABELS[open.kind]}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{open.fileName}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <EvidenceViewer
                  data={d}
                  documents={[open]}
                  instruments={d.instruments.filter((i) => i.id === open.instrumentId)}
                  institutionId={open.institutionId}
                  activeField={activeField}
                  onActiveFieldChange={setActiveField}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PortalPage>
  );
}
