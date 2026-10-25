"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Quote, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { EmptyState } from "@/components/empty-state";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS, userName } from "@/components/tables/columns";
import { CaseTimeline, ChecklistPanel, ClearancesPanel, DecisionPanel, Panel } from "@/components/official/case-panels";
import { EvidenceViewer } from "@/components/official/evidence-viewer";
import { Meta, RecordHeader, ReleaseStepper, suggestedDecisionRef } from "@/components/official/record-header";
import { caseEntityIds } from "@/lib/evidence";
import { instrumentDisplayStatus } from "@/lib/status";
import { useCan, useCommand } from "@/hooks/use-command";
import { useDemoStore } from "@/store/demo-store";
import { useDemoData, useToday } from "@/store/hooks";
import type { ExtractionField } from "@/types";

/** Release review: Clause 6.46 checklist, clearances, and the authorised decision (brief §7.3). */
export default function ReleaseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDemoData();
  const today = useToday();
  const rr = d.releaseRequests.find((r) => r.id === id);
  const c = d.cases.find((x) => x.id === rr?.caseId);
  const [activeField, setActiveField] = useState<ExtractionField | null>(null);
  const requestClearances = useDemoStore((s) => s.requestClearances);
  const assignCase = useDemoStore((s) => s.assignCase);
  const { run, busy } = useCommand();
  const canRequest = useCan("requestClearances", rr?.institutionId);
  const canAssign = useCan("assignCase", rr?.institutionId);

  const events = useMemo(() => {
    if (!c) return [];
    const ids = caseEntityIds(d, c.id);
    return d.audit.filter((e) => ids.has(e.entityId));
  }, [d, c]);

  if (!rr || !c) {
    return <EmptyState title="Release request not found" description="It may have been reset with the demo data." action={<Button asChild variant="outline" size="sm"><Link href="/official/releases">Back to release requests</Link></Button>} />;
  }

  const institution = d.institutions.find((i) => i.id === rr.institutionId);
  const obligation = d.obligations.find((o) => o.id === rr.obligationId);
  const instruments = d.instruments.filter((i) => rr.instrumentIds.includes(i.id));
  const evidenceIds = new Set(d.checklistItems.filter((i) => i.caseId === c.id).map((i) => i.evidenceDocumentId));
  const documents = d.documents
    .filter((doc) => doc.caseId === c.id || (doc.instrumentId && rr.instrumentIds.includes(doc.instrumentId)) || evidenceIds.has(doc.id))
    .sort((a, b) => (a.kind === "release_application" ? -1 : b.kind === "release_application" ? 1 : 0));
  const beforeClearances = ["submitted", "completeness_review", "in_verification"].includes(rr.status);

  return (
    <div className="space-y-6">
      <RecordHeader
        backHref="/official/releases"
        backLabel="Release requests"
        eyebrow={
          <>
            <IdText value={rr.ref} />
            <span>·</span>
            <span>Case {c.ref}</span>
            <span>·</span>
            <span>{institution?.name}</span>
          </>
        }
        title={`Release of ${obligation ? OBLIGATION_KIND_LABELS[obligation.kind].toLowerCase() : ""} deposit`}
        badges={<StatusBadge status={rr.status} />}
        actions={
          <>
            {!c.assigneeId && canAssign && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => run(() => assignCase({ caseId: c.id }), `${c.ref} assigned to you`)}>
                <UserPlus className="size-3.5" /> Claim
              </Button>
            )}
            {canRequest && beforeClearances && (
              <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => run(() => requestClearances({ releaseRequestId: rr.id }), `Clearances requested on ${rr.ref}`)}>
                <Send className="size-3.5" /> Request clearances
              </Button>
            )}
          </>
        }
        meta={
          <>
            <Meta label="Amount"><MoneyText paise={rr.totalPaise} /></Meta>
            <Meta label="Submitted"><DateText at={rr.submittedAt} /></Meta>
            <Meta label="Submitted by">{userName(rr.submittedBy)}</Meta>
            <Meta label="Case officer">{c.assigneeId ? userName(c.assigneeId) : <span className="text-status-warning">Unassigned</span>}</Meta>
          </>
        }
      />

      <ReleaseStepper status={rr.status} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <Panel title="Request" icon={Quote}>
            <div className="space-y-4 px-4 py-4">
              <blockquote className="border-l-2 border-primary/40 pl-3 text-sm text-pretty">{rr.reason}</blockquote>
              <ul className="divide-y rounded-lg border">
                {instruments.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <IdText value={i.instrumentNo} />
                      <p className="text-xs text-muted-foreground">{i.type} · {i.bankName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <MoneyText paise={i.amountPaise} className="text-sm" />
                      <StatusBadge status={instrumentDisplayStatus(i, today)} className="h-5 text-[11px]" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
          <EvidenceViewer data={d} documents={documents} instruments={instruments} institutionId={rr.institutionId} activeField={activeField} onActiveFieldChange={setActiveField} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <DecisionPanel caseItem={c} suggestedRef={suggestedDecisionRef("REL", rr.ref)} />
          <ClearancesPanel data={d} releaseRequestId={rr.id} />
          <ChecklistPanel data={d} caseItem={c} />
          <CaseTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
