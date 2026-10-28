"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { GitBranch, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { EmptyState } from "@/components/empty-state";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS, userName } from "@/components/tables/columns";
import { MarkReadyDialog, RequestCorrectionDialog } from "@/components/official/action-dialogs";
import { CaseTimeline, ChecklistPanel, DecisionPanel, DiscrepancyPanel, FindingsPanel } from "@/components/official/case-panels";
import { EvidenceViewer } from "@/components/official/evidence-viewer";
import { Meta, RecordHeader, suggestedDecisionRef } from "@/components/official/record-header";
import { caseEntityIds } from "@/lib/evidence";
import { replacementImpact } from "@/lib/replacement-impact";
import { acceptanceBadgeLabel, coverStanding } from "@/lib/coverage";
import { ReplacementImpactPanel, ReviewsPanel, StaleBanner, useOpenedBasis } from "@/components/replacement/replacement-impact";
import { instrumentDisplayStatus } from "@/lib/status";
import { useCan, useCommand } from "@/hooks/use-command";
import { useDemoStore } from "@/store/demo-store";
import { useDemoData, useSession, useToday } from "@/store/hooks";
import type { ExtractionField } from "@/types";

const CASE_TYPE: Record<string, string> = { deposit_verification: "Deposit verification", release: "Release", renewal: "Renewal" };

/** Case workbench: evidence, discrepancies, findings, checklist and the authorised decision. */
export default function CaseWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const c = d.cases.find((x) => x.id === id);
  const [activeField, setActiveField] = useState<ExtractionField | null>("amount");
  const assignCase = useDemoStore((s) => s.assignCase);
  const { run, busy } = useCommand();
  const canAssign = useCan("assignCase", c?.institutionId);
  const canCorrect = useCan("requestCorrection", c?.institutionId);
  const canMarkReady = useCan("markReadyForDecision", c?.institutionId);
  // What the official saw when the case was opened; a decision on an outdated view is rejected by the store.
  const { opened, changes, refresh } = useOpenedBasis(d, c?.id);

  // Release cases are reviewed on the release request page.
  useEffect(() => {
    if (c?.type === "release" && c.releaseRequestId) router.replace(`/official/releases/${c.releaseRequestId}`);
  }, [c, router]);

  const events = useMemo(() => {
    if (!c) return [];
    const ids = caseEntityIds(d, c.id);
    return d.audit.filter((e) => ids.has(e.entityId));
  }, [d, c]);

  if (!c) {
    return <EmptyState title="Case not found" description="It may have been reset with the demo data." action={<Button asChild variant="outline" size="sm"><Link href="/official/cases">Back to cases</Link></Button>} />;
  }
  if (c.type === "release") return null;

  const institution = d.institutions.find((i) => i.id === c.institutionId);
  const instruments = d.instruments.filter((i) => c.instrumentIds.includes(i.id));
  // For a renewal the successor is the instrument under review; otherwise the first one.
  const primary = instruments.find((i) => i.predecessorInstrumentId && c.instrumentIds.includes(i.predecessorInstrumentId)) ?? instruments[0];
  const obligation = d.obligations.find((o) => o.id === primary?.obligationId);
  const evidenceIds = new Set(d.checklistItems.filter((i) => i.caseId === c.id).map((i) => i.evidenceDocumentId));
  const documents = d.documents
    .filter((doc) => doc.caseId === c.id || (doc.instrumentId && c.instrumentIds.includes(doc.instrumentId)) || evidenceIds.has(doc.id))
    .sort((a, b) => (a.kind === "fdr_receipt" ? 0 : 1) - (b.kind === "fdr_receipt" ? 0 : 1) || b.version - a.version);
  const openFindings = d.findings.filter((f) => f.caseId === c.id && f.status === "open").length;
  const active = !["approved", "rejected", "closed"].includes(c.status);
  const acceptedRenewal = d.renewals.find((r) => r.caseId === c.id);
  const predecessor = primary?.predecessorInstrumentId ? d.instruments.find((i) => i.id === primary.predecessorInstrumentId && c.instrumentIds.includes(i.id)) : undefined;
  const impact = predecessor && primary ? replacementImpact(d, predecessor.id, { id: primary.id }) : null;
  const obligationLabel = obligation ? `${OBLIGATION_KIND_LABELS[obligation.kind]} · ${d.institutions.find((i) => i.id === obligation.institutionId)?.shortName ?? ""} · AY ${obligation.academicYear}` : "—";
  const reviewing = ["open", "in_review"].includes(c.status);

  return (
    <div className="space-y-6">
      <RecordHeader
        backHref="/official/cases"
        backLabel="Verification cases"
        eyebrow={
          <>
            <IdText value={c.ref} />
            <span>·</span>
            <span>{CASE_TYPE[c.type]}</span>
            <span>·</span>
            <span>{institution?.name}</span>
          </>
        }
        title={c.title}
        badges={
          <>
            <StatusBadge status={c.status} />
            {primary && <StatusBadge status={instrumentDisplayStatus(primary, today)} label={`Instrument: ${acceptanceBadgeLabel(d, primary, today) ?? instrumentDisplayStatus(primary, today).replace(/_/g, " ")}`} />}
          </>
        }
        actions={
          active && (
            <>
              {!c.assigneeId && canAssign && (
                <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => run(() => assignCase({ caseId: c.id }), `${c.ref} assigned to you`)}>
                  <UserPlus className="size-3.5" /> Claim case
                </Button>
              )}
              {canCorrect && reviewing && (
                <RequestCorrectionDialog caseId={c.id} openFindings={openFindings} trigger={<Button variant="outline" size="sm" className="gap-1.5"><Send className="size-3.5" /> Request correction</Button>} />
              )}
              {canMarkReady && reviewing && <MarkReadyDialog caseId={c.id} trigger={<Button size="sm">Mark ready for decision</Button>} />}
            </>
          )
        }
        meta={
          <>
            <Meta label="Instrument">{primary ? <IdText value={primary.instrumentNo} /> : "—"}</Meta>
            <Meta label="Amount">{primary ? <MoneyText paise={primary.amountPaise} /> : "—"}</Meta>
            <Meta label="Obligation">
              {obligation ? (
                <span>
                  {OBLIGATION_KIND_LABELS[obligation.kind]} · <MoneyText paise={obligation.requiredPaise} compact />
                </span>
              ) : (
                "—"
              )}
            </Meta>
            <Meta label="Assigned to">{c.assigneeId ? userName(c.assigneeId) : <span className="text-status-warning">Unassigned</span>}</Meta>
            <Meta label="Opened"><DateText at={c.openedAt} /></Meta>
            <Meta label="Due">{c.dueDate ? <DateText date={c.dueDate} relative /> : "—"}</Meta>
            <Meta label="Maturity">{primary ? <DateText date={primary.maturityDate} /> : "—"}</Meta>
            {acceptedRenewal && (
              <Meta label="Replacement effective">
                <span className="font-medium"><DateText date={acceptedRenewal.effectiveFrom} /></span> · {coverStanding(d, primary!, today).label}
              </Meta>
            )}
            <Meta label="Lineage">
              {primary?.predecessorInstrumentId ? (
                <span className="inline-flex items-center gap-1 font-mono text-[13px]">
                  <GitBranch className="size-3.5 text-muted-foreground" aria-hidden />
                  {d.instruments.find((i) => i.id === primary.predecessorInstrumentId)?.instrumentNo}
                </span>
              ) : (
                "First instrument"
              )}
            </Meta>
          </>
        }
      />

      {active && <StaleBanner changes={changes} onRefresh={refresh} institutionId={c.institutionId} />}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {impact && <ReplacementImpactPanel impact={impact} obligationLabel={obligationLabel} />}
          <EvidenceViewer data={d} documents={documents} instruments={instruments} institutionId={c.institutionId} activeField={activeField} onActiveFieldChange={setActiveField} />
          {primary && <DiscrepancyPanel data={d} caseItem={c} instrument={primary} activeField={activeField} onSelectField={setActiveField} />}
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <DecisionPanel caseItem={c} suggestedRef={suggestedDecisionRef(c.type === "renewal" ? "REN" : "VER", c.ref)} basis={opened} />
          {primary && (c.type === "renewal" || d.reviews.some((r) => r.instrumentId === primary.id)) && (
            <ReviewsPanel data={d} original={predecessor ?? null} successor={primary} institutionId={c.institutionId} />
          )}
          <FindingsPanel data={d} caseItem={c} />
          <ChecklistPanel data={d} caseItem={c} />
          <CaseTimeline events={events} />
        </div>
      </div>
      {session?.role === "auditor" && <p className="text-xs text-muted-foreground">Read-only: auditors cannot change records.</p>}
    </div>
  );
}
