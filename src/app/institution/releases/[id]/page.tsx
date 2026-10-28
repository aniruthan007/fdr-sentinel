"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { EmptyState } from "@/components/empty-state";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS } from "@/components/tables/columns";
import { CaseTimeline, ChecklistPanel, ClearancesPanel, DecisionPanel } from "@/components/official/case-panels";
import { EvidenceViewer } from "@/components/official/evidence-viewer";
import { Meta, RecordHeader, ReleaseStepper } from "@/components/official/record-header";
import { caseEntityIds } from "@/lib/evidence";
import { useDemoData, useSession } from "@/store/hooks";
import type { ExtractionField, ReleaseStatus } from "@/types";

/** Plain-language next step for each release state (brief §7.3). */
const NEXT: Record<ReleaseStatus, string> = {
  draft: "Not submitted yet.",
  submitted: "A processing officer will check that the Clause 6.46 documents are complete.",
  completeness_review: "A processing officer is checking that the Clause 6.46 documents are complete.",
  in_verification: "Your documents are being verified.",
  awaiting_clearances: "Waiting on clearances from PGRC, the Vigilance Cell and any other applicable cell, then the Approval Bureau NOC (FDR/RPGF) or Council sanction (RTGS).",
  awaiting_institution_response: "The officer needs more information from you.",
  ready_for_decision: "Every clearance is recorded. The request is with the Approver for an authorised decision — this is not yet an approval.",
  approved: "Approved. The decision and its reference are recorded below. The system never moves money itself.",
  rejected: "Not approved. The reason is recorded below.",
  returned: "Returned to you by the Approver.",
  on_hold: "On hold.",
  closed: "Closed.",
};

export default function InstitutionReleaseTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const d = useDemoData();
  const session = useSession();
  const [activeField, setActiveField] = useState<ExtractionField | null>(null);
  const found = d.releaseRequests.find((r) => r.id === id);
  // Data isolation: another institution's request does not exist here.
  const rr = found && found.institutionId === session?.institutionId ? found : undefined;
  const c = d.cases.find((x) => x.id === rr?.caseId);

  const events = useMemo(() => {
    if (!c) return [];
    const ids = caseEntityIds(d, c.id);
    return d.audit.filter((e) => ids.has(e.entityId));
  }, [d, c]);

  if (!rr || !c) {
    return <EmptyState title="Release request not found" action={<Button asChild variant="outline" size="sm"><Link href="/institution/releases">Back to release requests</Link></Button>} />;
  }

  const obligation = d.obligations.find((o) => o.id === rr.obligationId);
  const instruments = d.instruments.filter((i) => rr.instrumentIds.includes(i.id));
  const documents = d.documents.filter((x) => x.caseId === c.id || (x.instrumentId && rr.instrumentIds.includes(x.instrumentId) && x.kind === "fdr_receipt"));

  return (
    <div className="space-y-6">
      <RecordHeader
        backHref="/institution/releases"
        backLabel="Release requests"
        eyebrow={<IdText value={rr.ref} />}
        title={`Release of ${obligation ? OBLIGATION_KIND_LABELS[obligation.kind].toLowerCase() : ""} deposit`}
        badges={<StatusBadge status={rr.status} />}
        meta={
          <>
            <Meta label="Amount"><MoneyText paise={rr.totalPaise} /></Meta>
            <Meta label="Submitted"><DateText at={rr.submittedAt} /></Meta>
            <Meta label="Instruments"><span className="font-mono text-[13px]">{instruments.map((i) => i.instrumentNo).join(", ")}</span></Meta>
            <Meta label="Decided">{rr.decidedAt ? <DateText at={rr.decidedAt} /> : "—"}</Meta>
          </>
        }
      />

      <ReleaseStepper status={rr.status} />

      <p className="flex items-start gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-soft">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="font-medium">What happens next: </span>
          {NEXT[rr.status]}
        </span>
      </p>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <EvidenceViewer data={d} documents={documents} instruments={instruments} institutionId={rr.institutionId} activeField={activeField} onActiveFieldChange={setActiveField} />
          <CaseTimeline events={events} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <DecisionPanel caseItem={c} suggestedRef="" basis="" />
          <ClearancesPanel data={d} releaseRequestId={rr.id} />
          <ChecklistPanel data={d} caseItem={c} />
        </div>
      </div>
    </div>
  );
}
