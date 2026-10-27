"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, GitCompareArrows, Info, ListChecks, RefreshCcw, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { userName } from "@/components/tables/columns";
import { Panel } from "@/components/official/case-panels";
import { useCan, useCommand } from "@/hooks/use-command";
import { formatDate } from "@/lib/dates";
import type { ImpactFinding, ImpactInstrument, ImpactLevel, ReplacementImpact } from "@/lib/replacement-impact";
import { basisChanges, currentDocument, currentReview, decisionBasis, encodeBasis, REVIEW_KIND_LABELS, REVIEW_KIND_MEANING, REVIEW_KINDS, reviewHistory } from "@/lib/reviews";
import { useDemoStore } from "@/store/demo-store";
import type { DemoData } from "@/data/seed";
import type { FinancialInstrument, ReviewRecord } from "@/types";

const LEVEL: Record<ImpactLevel, { icon: typeof Info; className: string; label: string }> = {
  attention: { icon: AlertTriangle, className: "text-status-danger", label: "Needs attention" },
  insufficient: { icon: CircleHelp, className: "text-status-warning", label: "Insufficient information" },
  info: { icon: Info, className: "text-status-info", label: "For information" },
  ok: { icon: CheckCircle2, className: "text-status-success", label: "No apparent issue" },
};

const OVERALL_CLASS: Record<ReplacementImpact["overall"], string> = {
  attention: "border-status-danger-border bg-status-danger-bg text-status-danger",
  insufficient: "border-status-warning-border bg-status-warning-bg text-status-warning",
  ok: "border-status-success-border bg-status-success-bg text-status-success",
};

function InstrumentColumn({ title, inst }: { title: string; inst: ImpactInstrument }) {
  return (
    <div className="min-w-0 space-y-1 rounded-lg border p-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <IdText value={inst.instrumentNo || "—"} />
      <p className="truncate text-xs text-muted-foreground">{inst.bankName}</p>
      <MoneyText paise={inst.amountPaise} className="block text-sm font-medium" />
      <p className="text-xs text-muted-foreground tabular">
        {inst.issueDate ? formatDate(inst.issueDate) : "—"} → {inst.maturityDate ? formatDate(inst.maturityDate) : "no maturity"}
      </p>
    </div>
  );
}

function FindingRow({ f }: { f: ImpactFinding }) {
  const { icon: Icon, className, label } = LEVEL[f.level];
  return (
    <li className="flex gap-3 px-4 py-2.5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-label={label} />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{f.title}</p>
        <p className="text-xs text-pretty text-muted-foreground">{f.reason}</p>
        {f.nextAction && (
          <p className="flex items-start gap-1 text-xs text-foreground">
            <ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span><span className="font-medium">Next:</span> {f.nextAction}</span>
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The replacement-impact explanation, shared by the institution's replacement form and the official case view.
 * Deterministic arithmetic only — it reports apparent issues and never approves anything.
 */
export function ReplacementImpactView({ impact, obligationLabel, compact }: { impact: ReplacementImpact; obligationLabel: string; compact?: boolean }) {
  const ordered = [...impact.findings].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  return (
    <div className="space-y-3">
      <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium", OVERALL_CLASS[impact.overall])} role="status">
        {impact.overall === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <ShieldQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />}
        <span>
          {impact.overallLabel}
          <span className="block text-[11px] font-normal opacity-90">Deterministic checks to support review. Not an approval and not a finding of wrongdoing.</span>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <InstrumentColumn title="Original" inst={impact.original} />
        <InstrumentColumn title="Proposed successor" inst={impact.successor} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border px-3 py-2.5 text-xs sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-muted-foreground">Continuing obligation</dt>
          <dd className="font-medium">{obligationLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Required</dt>
          <dd>{impact.requiredPaise === null ? <span className="text-status-warning">Unknown</span> : <MoneyText paise={impact.requiredPaise} />}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Other accepted</dt>
          <dd><MoneyText paise={impact.otherAcceptedPaise} /></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Coverage after</dt>
          <dd><MoneyText paise={impact.coverageAfterPaise} /></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Apparent shortfall</dt>
          <dd className={cn(impact.shortfallPaise ? "font-medium text-status-danger" : "")}>
            {impact.shortfallPaise === null ? "—" : <MoneyText paise={impact.shortfallPaise} />}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Handover date (day after original matures)</dt>
          <dd className="tabular">{impact.handoverDate ? formatDate(impact.handoverDate) : "Unknown"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Apparent date gap</dt>
          <dd className={cn("tabular", impact.gapDays ? "font-medium text-status-danger" : "")}>
            {impact.gapDays ? `${impact.gapDays} day${impact.gapDays === 1 ? "" : "s"} · ${formatDate(impact.gapFrom!)} – ${formatDate(impact.gapTo!)}` : "None"}
          </dd>
        </div>
      </dl>

      <ul className="divide-y rounded-lg border" aria-label="Replacement impact findings">
        {ordered.map((f) => <FindingRow key={f.code} f={f} />)}
      </ul>
      {!compact && (
        <p className="text-[11px] text-pretty text-muted-foreground">
          Demo assumptions, not statutory rules: coverage runs from deposit date to maturity date inclusive (IST calendar days); the successor is
          needed from the day after the original matures; no grace period is assumed. The original is never counted alongside its own
          replacement, and candidates still under review are not counted.
        </p>
      )}
    </div>
  );
}

const ORDER: Record<ImpactLevel, number> = { attention: 0, insufficient: 1, info: 2, ok: 3 };

export function ReplacementImpactPanel({ impact, obligationLabel }: { impact: ReplacementImpact; obligationLabel: string }) {
  return (
    <Panel title="Replacement impact" icon={GitCompareArrows}>
      <div className="px-4 py-4">
        <ReplacementImpactView impact={impact} obligationLabel={obligationLabel} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Reviews and confirmations — per instrument, per evidence version
// ---------------------------------------------------------------------------------------------

const REVIEW_STATUS: Record<ReviewRecord["status"], { label: string; className: string }> = {
  complete: { label: "Complete", className: "border-status-success-border bg-status-success-bg text-status-success" },
  pending: { label: "Pending", className: "border-status-warning-border bg-status-warning-bg text-status-warning" },
  needs_attention: { label: "Needs attention", className: "border-status-danger-border bg-status-danger-bg text-status-danger" },
};

function ReviewLine({ r, currentVersion }: { r: ReviewRecord | undefined; currentVersion: number | null; kind: ReviewRecord["kind"] }) {
  if (!r) return <span className="text-xs text-muted-foreground">Not started</span>;
  const stale = r.status === "complete" && currentVersion !== null && r.evidenceVersion !== currentVersion;
  const meta = stale ? { label: "Superseded evidence", className: REVIEW_STATUS.needs_attention.className } : REVIEW_STATUS[r.status];
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium", meta.className)}>{meta.label}</span>
        <span className="rounded border border-dashed px-1 font-mono text-[10px] text-muted-foreground" title="Who or what produced this result">{r.source}</span>
        {r.evidenceVersion !== null && <span className="font-mono text-[10px] text-muted-foreground">receipt v{r.evidenceVersion}</span>}
        {r.reference && <IdText value={r.reference} className="text-[11px]" />}
      </div>
      <p className="text-xs text-pretty">{r.summary}</p>
      {r.reason && r.status !== "complete" && <p className="text-xs text-pretty text-status-warning">{r.reason}</p>}
      {r.recordedAt && (
        <p className="text-[11px] text-muted-foreground">
          {r.recordedBy === "system" ? "Automated" : userName(r.recordedBy)} · <DateText at={r.recordedAt} />
        </p>
      )}
    </div>
  );
}

function InstrumentReviews({ data, inst, role, canRequestBank }: { data: DemoData; inst: FinancialInstrument; role: string; canRequestBank: boolean }) {
  const requestBank = useDemoStore((s) => s.requestBankConfirmation);
  const { run, busy } = useCommand();
  const [showHistory, setShowHistory] = useState(false);
  const doc = currentDocument(data, inst.id);
  const history = reviewHistory(data, inst.id);
  const bank = currentReview(data, inst.id, "bank_confirmation");
  const bankDone = bank?.status === "complete" && bank.evidenceDocumentId === doc?.id;
  const reviewable = ["submitted", "under_review", "needs_correction"].includes(inst.status);

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{role}</p>
          <IdText value={inst.instrumentNo} />
          <p className="text-[11px] text-muted-foreground">Current evidence: {doc ? `${doc.fileName} · v${doc.version}` : "no receipt on file"}</p>
        </div>
        {canRequestBank && reviewable && !bankDone && doc && (
          <Button size="xs" variant="outline" className="gap-1" disabled={busy} onClick={() => run(() => requestBank({ instrumentId: inst.id }), "Bank confirmation recorded (SIMULATED source)")}>
            <RefreshCcw className="size-3" /> Request bank confirmation (simulated)
          </Button>
        )}
      </div>
      <ul className="space-y-2.5">
        {REVIEW_KINDS.map((kind) => (
          <li key={kind} className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
            <div>
              <p className="text-xs font-medium">{REVIEW_KIND_LABELS[kind]}</p>
              <p className="text-[11px] text-muted-foreground">{REVIEW_KIND_MEANING[kind]}</p>
            </div>
            <ReviewLine r={currentReview(data, inst.id, kind)} currentVersion={doc?.version ?? null} kind={kind} />
          </li>
        ))}
      </ul>
      {history.length > REVIEW_KINDS.length && (
        <div>
          <Button size="xs" variant="ghost" className="-ml-2" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
            {showHistory ? "Hide" : "Show"} review history ({history.length})
          </Button>
          {showHistory && (
            <ol className="mt-1 space-y-1 border-l pl-3">
              {history.map((r) => (
                <li key={r.id} className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{REVIEW_KIND_LABELS[r.kind]}</span> · {REVIEW_STATUS[r.status].label}
                  {r.evidenceVersion !== null && ` · receipt v${r.evidenceVersion}`}
                  {r.supersededById && " · superseded"} · <DateText at={r.createdAt} />
                  {r.reason && <span className="block">{r.reason}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/** Original and successor side by side (or a single instrument): each keeps its own reviews; nothing is copied across. */
export function ReviewsPanel({ data, original, successor, institutionId }: { data: DemoData; original: FinancialInstrument | null; successor: FinancialInstrument; institutionId: string }) {
  const canRequestBank = useCan("requestBankConfirmation", institutionId);
  return (
    <Panel title="Reviews and confirmations" icon={ListChecks} aside={<span className="text-xs text-muted-foreground">per instrument · per evidence version</span>}>
      <div className="divide-y">
        <InstrumentReviews data={data} inst={successor} role={original ? "Proposed successor" : "This instrument"} canRequestBank={canRequestBank} />
        {original && <InstrumentReviews data={data} inst={original} role="Original — history preserved, not transferred" canRequestBank={false} />}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Stale-state guard for decisions
// ---------------------------------------------------------------------------------------------

/** Captures the decision basis when the case is opened and reports what has changed since. */
export function useOpenedBasis(data: DemoData, caseId: string | undefined) {
  const current = caseId ? decisionBasis(data, caseId) : null;
  const [opened, setOpened] = useState<string>(() => (current ? encodeBasis(current) : ""));
  const changes = current ? basisChanges(opened, current) : [];
  return { opened, changes, refresh: () => current && setOpened(encodeBasis(current)) };
}

/** Shown to the Approver only: it is their decision that the store rejects when the view is out of date. */
export function StaleBanner({ changes, onRefresh, institutionId }: { changes: string[]; onRefresh: () => void; institutionId: string }) {
  const canDecide = useCan("recordDecision", institutionId);
  if (!changes.length || !canDecide) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning">
      <p className="min-w-0">
        <span className="font-semibold">This case changed after you opened it:</span> {changes.join(", ")}. A decision based on the earlier view
        will be rejected.
      </p>
      <Button size="sm" variant="outline" onClick={onRefresh} className="bg-card">
        I have reviewed the current state
      </Button>
    </div>
  );
}
