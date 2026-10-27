"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Check, FileText, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { StatusBadge } from "@/components/status-badge";
import { DOCUMENT_KIND_LABELS, EXTRACTION_FIELD_LABELS } from "@/data/documents";
import { userName } from "@/components/tables/columns";
import { formatFieldValue } from "@/lib/evidence";
import { useCan, useCommand } from "@/hooks/use-command";
import { useDemoStore } from "@/store/demo-store";
import type { DemoData } from "@/data/seed";
import type { DocumentRecord, ExtractionField, FinancialInstrument } from "@/types";
import { DocumentReplica, LOW_CONFIDENCE } from "./document-replica";

interface EvidenceViewerProps {
  data: DemoData;
  documents: DocumentRecord[];
  instruments: FinancialInstrument[];
  institutionId: string;
  /** Lets a parent (e.g. the discrepancy panel) drive which field is highlighted. */
  activeField: ExtractionField | null;
  onActiveFieldChange: (f: ExtractionField | null) => void;
}

/** Signature moment 3: click a field and the document highlights the region it was read from. */
export function EvidenceViewer({ data, documents, instruments, institutionId, activeField, onActiveFieldChange }: EvidenceViewerProps) {
  // Earlier evidence versions stay visible as history; the current version is shown unless another is picked.
  const supersededIds = new Set(documents.map((d) => d.supersedesDocumentId).filter(Boolean));
  const [picked, setDocId] = useState<string | null>(null);
  const docId = picked ?? documents.find((d) => d.kind === "fdr_receipt" && !supersededIds.has(d.id))?.id ?? documents[0]?.id ?? "";
  const confirmField = useDemoStore((s) => s.confirmField);
  const { run, busy } = useCommand();
  const canConfirm = useCan("confirmField", institutionId);

  const doc = documents.find((d) => d.id === docId) ?? documents[0];
  if (!doc) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No documents on this case.</p>;
  }
  const extractions = data.extractions.filter((e) => e.documentId === doc.id);
  const superseded = supersededIds.has(doc.id);
  const unconfirmed = extractions.filter((e) => !e.confirmedAt);
  async function confirmAll() {
    // One command (and one audit event) per field; a single toast for the batch.
    let n = 0;
    for (const e of unconfirmed) {
      const r = await confirmField({ extractionId: e.id });
      if (!r.ok) {
        toast.error("Not recorded", { description: r.error });
        return;
      }
      n += 1;
    }
    toast.success(`${n} fields confirmed on v${doc.version}`);
  }
  const instrument = instruments.find((i) => i.id === doc.instrumentId);
  const institution = data.institutions.find((i) => i.id === institutionId);

  return (
    <section className="space-y-3" aria-label="Evidence">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {documents.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDocId(d.id);
              onActiveFieldChange(null);
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
              d.id === doc.id ? "border-primary/40 bg-accent font-medium text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            <FileText className="size-3.5" aria-hidden />
            {DOCUMENT_KIND_LABELS[d.kind]}
            {(d.version > 1 || supersededIds.has(d.id)) && (
              <span className={cn("font-mono text-[10px]", supersededIds.has(d.id) && "line-through")}>v{d.version}</span>
            )}
          </button>
        ))}
      </div>

      <DocumentReplica
        document={doc}
        extractions={extractions}
        instrument={instrument}
        institutionName={institution?.name ?? ""}
        activeField={activeField}
        onSelectField={(f) => onActiveFieldChange(activeField === f ? null : f)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{doc.fileName}</span>
        <span className="flex items-center gap-2">
          v{doc.version} · Uploaded <DateText at={doc.uploadedAt} /> · <StatusBadge status={doc.status} className="h-5 text-[11px]" />
        </span>
      </div>
      {superseded && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Superseded by a newer version. Kept as history; reviews of the current version do not rely on it.
        </p>
      )}

      {extractions.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <ScanSearch className="size-3.5 text-primary" aria-hidden />
              Extracted fields
            </p>
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              Suggestions only · {extractions[0].source}
              {canConfirm && !superseded && unconfirmed.length > 1 && (
                <Button size="xs" variant="outline" disabled={busy} onClick={confirmAll}>
                  Confirm all {unconfirmed.length}
                </Button>
              )}
            </span>
          </div>
          <ul className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-y-0">
            {extractions.map((e) => {
              const active = activeField === e.field;
              const pct = Math.round(e.confidence * 100);
              const low = e.confidence < LOW_CONFIDENCE;
              return (
                <li key={e.id} className="min-w-0 sm:border-b sm:odd:border-r">
                  <div className={cn("flex items-center gap-3 px-3 py-2 transition-colors", active && "bg-accent/60")}>
                    <button type="button" onClick={() => onActiveFieldChange(active ? null : e.field)} className="min-w-0 flex-1 text-left" aria-pressed={active}>
                      <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        {EXTRACTION_FIELD_LABELS[e.field]}
                        <span className={cn("tabular", low && "font-medium text-status-warning")} title={low ? "Below the review threshold — check carefully" : undefined}>
                          {pct}%
                        </span>
                      </span>
                      <span className="block truncate font-mono text-[13px]">{formatFieldValue(e.field, e.value)}</span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-border">
                        <span className={cn("block h-full rounded-full", low ? "bg-status-warning" : "bg-primary/70")} style={{ width: `${pct}%` }} />
                      </span>
                    </button>
                    {e.confirmedAt ? (
                      <span className="shrink-0 text-status-success" title={`Confirmed by ${userName(e.confirmedBy)}`}>
                        <Check className="size-4" aria-label={`Confirmed by ${userName(e.confirmedBy)}`} />
                      </span>
                    ) : canConfirm && !superseded ? (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy}
                        onClick={() => run(() => confirmField({ extractionId: e.id }), `${EXTRACTION_FIELD_LABELS[e.field]} confirmed`)}
                      >
                        Confirm
                      </Button>
                    ) : (
                      <span className="shrink-0 text-[11px] text-muted-foreground">Unconfirmed</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No fields are extracted from this document; it is reviewed by eye.</p>
      )}
    </section>
  );
}
