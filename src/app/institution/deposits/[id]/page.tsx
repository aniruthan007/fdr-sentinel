"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Flag, GitBranch, RefreshCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { EmptyState } from "@/components/empty-state";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS } from "@/components/tables/columns";
import { CaseTimeline, DecisionPanel, Panel } from "@/components/official/case-panels";
import { EvidenceViewer } from "@/components/official/evidence-viewer";
import { Meta, RecordHeader } from "@/components/official/record-header";
import { AmendReplacementDialog, RenewDialog, RespondToCorrectionDialog } from "@/components/institution/institution-dialogs";
import { ReplacementImpactPanel, ReviewsPanel } from "@/components/replacement/replacement-impact";
import { replacementImpact } from "@/lib/replacement-impact";
import { LineageChain } from "@/components/institution/lineage-chain";
import { caseEntityIds } from "@/lib/evidence";
import { correctionMessage, latestCaseFor, lineage, renewalInProgress } from "@/lib/institution";
import { instrumentDisplayStatus } from "@/lib/status";
import { useCan } from "@/hooks/use-command";
import { useDemoData, useSession, useToday } from "@/store/hooks";
import type { ExtractionField } from "@/types";

/** One instrument as the institution sees it: evidence, lineage, review status and what to do next. */
export default function InstrumentPage() {
  const { id } = useParams<{ id: string }>();
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const [activeField, setActiveField] = useState<ExtractionField | null>("amount");
  const inst = d.instruments.find((i) => i.id === id);
  // Institution data isolation: another institution's instrument simply does not exist here.
  const mine = inst && inst.institutionId === session?.institutionId ? inst : undefined;
  const c = mine ? latestCaseFor(d, mine.id) : undefined;
  const canRenew = useCan("renewInstrument", mine?.institutionId);
  const canRespond = useCan("respondToCorrection", mine?.institutionId);
  const canAmend = useCan("amendReplacement", mine?.institutionId);

  const events = useMemo(() => {
    if (!mine) return [];
    const ids = c ? caseEntityIds(d, c.id) : new Set<string>([mine.id]);
    ids.add(mine.id);
    return d.audit.filter((e) => ids.has(e.entityId));
  }, [d, c, mine]);

  if (!mine) {
    return <EmptyState title="Instrument not found" action={<Button asChild variant="outline" size="sm"><Link href="/institution/deposits">Back to deposit register</Link></Button>} />;
  }

  const obligation = d.obligations.find((o) => o.id === mine.obligationId);
  const chain = lineage(d, mine.id);
  const status = instrumentDisplayStatus(mine, today);
  const documents = d.documents
    .filter((x) => x.instrumentId === mine.id || (c && x.caseId === c.id))
    .sort((a, b) => (a.kind === "fdr_receipt" ? 0 : 1) - (b.kind === "fdr_receipt" ? 0 : 1) || b.uploadedAt.localeCompare(a.uploadedAt));
  const findings = c ? d.findings.filter((f) => f.caseId === c.id) : [];
  const openFindings = findings.filter((f) => f.status !== "resolved");
  const awaiting = c?.status === "awaiting_institution";
  const renewing = renewalInProgress(d, mine.id);
  const request = c ? correctionMessage(d, c.id) : null;
  // Replacement pair: this instrument as a successor under review, or as the original of one.
  const original = mine.predecessorInstrumentId ? d.instruments.find((i) => i.id === mine.predecessorInstrumentId) : undefined;
  const successor = original ? mine : renewing;
  const pairOriginal = original ?? (renewing ? mine : undefined);
  const undecided = !!successor && ["submitted", "under_review", "needs_correction"].includes(successor.status);
  const impact = successor && pairOriginal && undecided ? replacementImpact(d, pairOriginal.id, { id: successor.id }) : null;
  const obligationLabel = obligation ? `${OBLIGATION_KIND_LABELS[obligation.kind]} deposit · AY ${obligation.academicYear}` : "—";

  return (
    <div className="space-y-6">
      <RecordHeader
        backHref="/institution/deposits"
        backLabel="Deposit register"
        eyebrow={
          <>
            <span>{mine.type}</span>
            <span>·</span>
            <span>{mine.bankName}</span>
            {obligation && (
              <>
                <span>·</span>
                <span>{OBLIGATION_KIND_LABELS[obligation.kind]} deposit</span>
              </>
            )}
          </>
        }
        title={mine.instrumentNo}
        badges={
          <>
            <StatusBadge status={status} />
            {c && <span className="text-xs text-muted-foreground">Case {c.ref} · <StatusBadge status={c.status} className="h-5 text-[11px]" /></span>}
          </>
        }
        actions={
          <>
            {awaiting && canRespond && c && (
              <RespondToCorrectionDialog caseId={c.id} caseRef={c.ref} instrumentNo={mine.instrumentNo} request={request} trigger={<Button size="sm" className="gap-1.5"><Send className="size-3.5" /> Respond to correction</Button>} />
            )}
            {mine.status === "active" && !renewing && canRenew && (
              <RenewDialog instrument={mine} trigger={<Button size="sm" variant={status === "near_maturity" || status === "matured" ? "default" : "outline"} className="gap-1.5"><RefreshCcw className="size-3.5" /> Renew / replace</Button>} />
            )}
            {original && undecided && canAmend && (
              <AmendReplacementDialog successor={mine} trigger={<Button size="sm" variant="outline" className="gap-1.5">Amend replacement</Button>} />
            )}
          </>
        }
        meta={
          <>
            <Meta label="Amount"><MoneyText paise={mine.amountPaise} /></Meta>
            <Meta label="Date of deposit"><DateText date={mine.issueDate} /></Meta>
            <Meta label="Maturity"><DateText date={mine.maturityDate} relative={mine.status === "active"} /></Meta>
            <Meta label="Lien holder">{mine.lienHolder}</Meta>
            <Meta label="Branch">{mine.branch}</Meta>
            <Meta label="IFSC"><IdText value={mine.ifsc} /></Meta>
            <Meta label="Submitted"><DateText at={mine.submittedAt} /></Meta>
            <Meta label="Renewal">{renewing ? <Link className="font-mono text-[13px] text-primary hover:underline" href={`/institution/deposits/${renewing.id}`}>{renewing.instrumentNo}</Link> : "—"}</Meta>
          </>
        }
      />

      {awaiting && (
        <div className="flex flex-col gap-3 rounded-xl border border-status-danger-border bg-status-danger-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Send className="mt-0.5 size-4 shrink-0 text-status-danger" aria-hidden />
            <div>
              <p className="text-sm font-medium text-status-danger">Correction requested</p>
              <p className="text-sm text-pretty">{request ?? "An officer asked for a corrected document."}</p>
            </div>
          </div>
          {canRespond && c && (
            <RespondToCorrectionDialog caseId={c.id} caseRef={c.ref} instrumentNo={mine.instrumentNo} request={request} trigger={<Button size="sm" className="shrink-0">Respond</Button>} />
          )}
        </div>
      )}

      {chain.length > 1 && (
        <Panel title="Renewal lineage" icon={GitBranch} aside={<span className="text-xs text-muted-foreground">{chain.length} generations · history kept</span>}>
          <div className="p-4">
            <LineageChain chain={chain} currentId={mine.id} today={today} hrefFor={(i) => `/institution/deposits/${i.id}`} />
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {impact && <ReplacementImpactPanel impact={impact} obligationLabel={obligationLabel} />}
          {successor && pairOriginal ? (
            <ReviewsPanel data={d} original={pairOriginal} successor={successor} institutionId={mine.institutionId} />
          ) : (
            d.reviews.some((r) => r.instrumentId === mine.id) && <ReviewsPanel data={d} original={null} successor={mine} institutionId={mine.institutionId} />
          )}
          <EvidenceViewer data={d} documents={documents} instruments={[mine]} institutionId={mine.institutionId} activeField={activeField} onActiveFieldChange={setActiveField} />
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <Panel title="Review" icon={Flag} aside={c && <StatusBadge status={c.status} className="h-5 text-[11px]" />}>
            {openFindings.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                {c ? (findings.length ? "All findings on this instrument are resolved." : "No findings raised.") : "No review case for this instrument."}
              </p>
            ) : (
              <ul className="divide-y">
                {openFindings.map((f) => (
                  <li key={f.id} className="space-y-1 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-status-warning">
                      <AlertTriangle className="size-3.5" aria-hidden /> Flagged for review
                      <StatusBadge status={f.status} className="ml-auto h-5 text-[11px]" />
                    </p>
                    <p className="text-sm">{f.description}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Findings are review items raised by an officer. They are not allegations.</p>
          </Panel>
          {c && <DecisionPanel caseItem={c} suggestedRef="" basis="" />}
          <CaseTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
