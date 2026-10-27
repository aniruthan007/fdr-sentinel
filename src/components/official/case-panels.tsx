"use client";

import { AlertTriangle, Check, CircleDashed, Flag, Gavel, Link2, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { IdText } from "@/components/id-text";
import { StatusBadge } from "@/components/status-badge";
import { userName } from "@/components/tables/columns";
import { CLEARANCE_DEPARTMENT_LABELS, CLEARANCE_ORDER } from "@/data/releases";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { ROLE_LABELS } from "@/lib/authz";
import { evidenceRows, formatFieldValue, type EvidenceRow } from "@/lib/evidence";
import { useCan } from "@/hooks/use-command";
import { useSession } from "@/store/hooks";
import type { DemoData } from "@/data/seed";
import type { AuditEvent, ExtractionField, FinancialInstrument, VerificationCase } from "@/types";
import {
  ChecklistOutcomeDialog,
  ClearanceDialog,
  DecisionDialog,
  RaiseFindingDialog,
  ResolveFindingDialog,
} from "./action-dialogs";

export function Panel({ title, icon: Icon, aside, children, className }: { title: string; icon?: typeof Flag; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-soft", className)}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Discrepancy panel — declared vs extracted vs on record (CLAUDE.md §5.4)
// ---------------------------------------------------------------------------------------------

export function DiscrepancyPanel({
  data,
  caseItem,
  instrument,
  activeField,
  onSelectField,
}: {
  data: DemoData;
  caseItem: VerificationCase;
  instrument: FinancialInstrument;
  activeField: ExtractionField | null;
  onSelectField: (f: ExtractionField) => void;
}) {
  const rows = evidenceRows(data, instrument);
  const canRaise = useCan("raiseFinding", caseItem.institutionId);
  const open = !["approved", "rejected", "closed"].includes(caseItem.status);
  const findings = data.findings.filter((f) => f.caseId === caseItem.id);
  const differing = rows.filter((r) => r.differs).length;

  return (
    <Panel
      title="Declared vs extracted vs on record"
      icon={AlertTriangle}
      aside={
        <span className={cn("text-xs", differing ? "font-medium text-status-danger" : "text-status-success")}>
          {differing ? `${differing} difference${differing > 1 ? "s" : ""}` : "All match"}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Field</th>
              <th className="px-2 py-2 font-medium">Declared</th>
              <th className="px-2 py-2 font-medium">Extracted</th>
              <th className="px-2 py-2 font-medium">On record</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const flagged = findings.some((f) => f.field === r.field);
              return (
                <tr
                  key={r.field}
                  onClick={() => r.extraction && onSelectField(r.field)}
                  className={cn("border-b last:border-0", r.extraction && "cursor-pointer hover:bg-muted/50", activeField === r.field && "bg-accent/60")}
                >
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.label}</td>
                  <Cell row={r} value={r.declared} tone={r.recordDiffers ? "warn" : undefined} />
                  <Cell
                    row={r}
                    value={r.extraction?.value ?? null}
                    tone={r.differs ? "bad" : r.extraction ? "ok" : undefined}
                    suffix={r.extraction ? `${Math.round(r.extraction.confidence * 100)}%` : undefined}
                  />
                  <Cell row={r} value={r.record} />
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {r.differs &&
                      (flagged ? (
                        <span className="text-[11px] text-muted-foreground">Flagged</span>
                      ) : canRaise && open ? (
                        <RaiseFindingDialog
                          caseId={caseItem.id}
                          preset={{ field: r.field, label: r.label, declared: r.declared, extracted: r.extraction?.value ?? null, record: r.record }}
                          trigger={
                            <Button size="xs" variant="outline" className="gap-1">
                              <Flag className="size-3" /> Flag
                            </Button>
                          }
                        />
                      ) : null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
        Differences become review findings, never fraud labels. On record = the official register (obligation amount, institution, lien holder).
      </p>
    </Panel>
  );
}

function Cell({ row, value, tone, suffix }: { row: EvidenceRow; value: string | null; tone?: "bad" | "warn" | "ok"; suffix?: string }) {
  return (
    <td className="px-2 py-2">
      <span
        className={cn(
          "inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded px-1.5 py-0.5 font-mono text-[12px] tabular",
          tone === "bad" && "bg-status-danger-bg text-status-danger",
          tone === "warn" && "bg-status-warning-bg text-status-warning",
        )}
        title={value ?? undefined}
      >
        {formatFieldValue(row.field, value)}
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </span>
    </td>
  );
}

// ---------------------------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------------------------

export function FindingsPanel({ data, caseItem }: { data: DemoData; caseItem: VerificationCase }) {
  const findings = data.findings.filter((f) => f.caseId === caseItem.id).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
  const canResolve = useCan("resolveFinding", caseItem.institutionId);
  const canRaise = useCan("raiseFinding", caseItem.institutionId);
  const open = !["approved", "rejected", "closed"].includes(caseItem.status);

  return (
    <Panel
      title="Findings"
      icon={Flag}
      aside={
        canRaise && open ? (
          <RaiseFindingDialog caseId={caseItem.id} trigger={<Button size="xs" variant="outline">Raise finding</Button>} />
        ) : undefined
      }
    >
      {findings.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No findings on this case.</p>
      ) : (
        <ul className="divide-y">
          {findings.map((f) => (
            <li key={f.id} className="space-y-1.5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={f.severity} className="h-5 text-[11px]" />
                <StatusBadge status={f.status} className="h-5 text-[11px]" />
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {userName(f.raisedBy)} · <DateText at={f.raisedAt} relative />
                </span>
              </div>
              <p className="text-sm">{f.description}</p>
              {f.resolution && (
                <p className="flex gap-1.5 text-xs text-status-success">
                  <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {f.resolution}
                </p>
              )}
              {f.status !== "resolved" && canResolve && open && (
                <ResolveFindingDialog findingId={f.id} trigger={<Button size="xs" variant="ghost" className="-ml-2">Resolve…</Button>} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------------------------

const CLEARANCE_BACKED = new Set(["req-646-05", "req-646-06"]);
const REVIEW_BACKED = new Set(["req-re-02"]);

export function ChecklistPanel({ data, caseItem }: { data: DemoData; caseItem: VerificationCase }) {
  const items = data.checklistItems.filter((i) => i.caseId === caseItem.id);
  const reqs = new Map(data.checklistRequirements.map((r) => [r.id, r]));
  const docs = data.documents.filter((d) => d.caseId === caseItem.id || (d.instrumentId && caseItem.instrumentIds.includes(d.instrumentId)) || (d.institutionId === caseItem.institutionId && d.kind === "letter_of_approval"));
  const canRecord = useCan("recordChecklistOutcome", caseItem.institutionId);
  const open = !["approved", "rejected", "closed"].includes(caseItem.status);
  const done = items.filter((i) => i.status === "satisfied" || i.status === "not_applicable").length;
  const kind = items[0] ? reqs.get(items[0].requirementId)?.checklist : undefined;
  const title = kind === "clause_6_46" ? "Clause 6.46 checklist" : kind === "replacement_evidence" ? "Replacement evidence (demo configuration)" : "Deposit lodgement checklist (demo configuration)";

  return (
    <Panel title={title} icon={ShieldCheck} aside={<span className="text-xs text-muted-foreground tabular">{done}/{items.length}</span>}>
      <ul className="divide-y">
        {items
          .sort((a, b) => (reqs.get(a.requirementId)?.code ?? "").localeCompare(reqs.get(b.requirementId)?.code ?? ""))
          .map((item) => {
            const req = reqs.get(item.requirementId);
            if (!req) return null;
            const evidence = data.documents.find((d) => d.id === item.evidenceDocumentId);
            const Icon = item.status === "satisfied" ? Check : item.status === "failed" ? X : CircleDashed;
            return (
              <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    item.status === "satisfied" && "text-status-success",
                    item.status === "failed" && "text-status-danger",
                    item.status === "pending" && "text-status-warning",
                    item.status === "not_applicable" && "text-muted-foreground",
                  )}
                  aria-label={item.status}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{req.code}</span>
                    {req.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground" title={req.sourceClause}>
                    {CLEARANCE_BACKED.has(req.id)
                      ? "Satisfied by recorded clearances"
                      : REVIEW_BACKED.has(req.id)
                        ? item.note ?? "Satisfied by a recorded bank confirmation on the current receipt"
                        : evidence
                        ? `Evidence: ${DOCUMENT_KIND_LABELS[evidence.kind]}`
                        : item.note ?? (item.status === "pending" ? "Not yet checked" : "")}
                    {item.checkedBy && ` · ${userName(item.checkedBy)}`}
                  </p>
                </div>
                {canRecord && open && !CLEARANCE_BACKED.has(req.id) && !REVIEW_BACKED.has(req.id) && item.status !== "satisfied" && (
                  <ChecklistOutcomeDialog itemId={item.id} requirement={req} documents={docs} trigger={<Button size="xs" variant="outline">Record</Button>} />
                )}
              </li>
            );
          })}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Clearances (release cases)
// ---------------------------------------------------------------------------------------------

export function ClearancesPanel({ data, releaseRequestId }: { data: DemoData; releaseRequestId: string }) {
  const session = useSession();
  const rr = data.releaseRequests.find((r) => r.id === releaseRequestId);
  const clearances = data.clearances
    .filter((c) => c.releaseRequestId === releaseRequestId)
    .sort((a, b) => CLEARANCE_ORDER.indexOf(a.department) - CLEARANCE_ORDER.indexOf(b.department));
  const canRecord = useCan("recordClearance", rr?.institutionId);
  if (!rr) return null;
  const done = clearances.filter((c) => c.status === "cleared" || c.status === "not_applicable").length;

  return (
    <Panel title="Clearances, then NOC / sanction" icon={ShieldCheck} aside={<span className="text-xs text-muted-foreground tabular">{done}/{clearances.length} recorded</span>}>
      <p className="border-b px-4 py-2 text-[11px] text-muted-foreground">
        Clearance outcomes from PGRC, the Vigilance Cell and other applicable cells/bureaus come first — any can be recorded Not applicable with a
        reason. Then, as separate records, the Approval Bureau NOC (FDR/RPGF) or Council sanction order (RTGS). Default applicability is demo
        configuration; all responses are SIMULATED.
      </p>
      <ul className="divide-y">
        {clearances.map((c) => (
          <li key={c.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {CLEARANCE_DEPARTMENT_LABELS[c.department]}
                <span className="rounded border border-dashed px-1 font-mono text-[10px] font-normal text-muted-foreground" title="Mock adapter: no real department system is connected">
                  {c.source}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.reference && <span className="mr-1.5 font-mono text-foreground">{c.reference}</span>}
                {c.remarks}
                {c.recordedAt && (
                  <>
                    {" · "}
                    {userName(c.recordedBy)}, <DateText at={c.recordedAt} />
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.status} className="h-5 text-[11px]" />
              {canRecord && c.assignedTo === session?.userId && ["pending", "further_info_required", "error_unavailable"].includes(c.status) && (
                <ClearanceDialog clearance={c} requestRef={rr.ref} trigger={<Button size="xs">Record</Button>} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------------------------

export function DecisionPanel({ caseItem, suggestedRef, basis }: { caseItem: VerificationCase; suggestedRef: string; basis: string }) {
  const canDecide = useCan("recordDecision", caseItem.institutionId);
  const d = caseItem.decision;
  return (
    <Panel title="Authorised decision" icon={Gavel}>
      <div className="space-y-3 px-4 py-4">
        {d ? (
          <>
            <div className="flex items-center gap-2">
              <StatusBadge status={d.outcome} />
              <IdText value={d.referenceNo} />
            </div>
            <p className="text-sm">{d.reason}</p>
            <p className="text-xs text-muted-foreground">
              {userName(d.decidedBy)} · {ROLE_LABELS.approver} · <DateText at={d.decidedAt} />
            </p>
          </>
        ) : caseItem.status === "ready_for_decision" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Every check is complete. <span className="font-medium text-foreground">This is not an approval</span> — only the Approver can record the decision, with a reason and an order/NOC reference.
            </p>
            {canDecide ? (
              <DecisionDialog caseId={caseItem.id} caseRef={caseItem.ref} suggestedRef={suggestedRef} basis={basis} trigger={<Button className="w-full gap-2 sm:w-auto"><Gavel className="size-4" /> Record decision</Button>} />
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for the Approver.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Not ready yet. The decision opens once every check{caseItem.type === "release" ? " and clearance" : ""} is complete.</p>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------------------------
// Timeline — the hash-chained audit events behind this case
// ---------------------------------------------------------------------------------------------

export function CaseTimeline({ events }: { events: AuditEvent[] }) {
  const sorted = [...events].sort((a, b) => b.seq - a.seq);
  return (
    <Panel title="History" icon={Link2} aside={<span className="text-xs text-muted-foreground">from the audit chain</span>}>
      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="relative px-4 py-3">
          <span className="absolute top-5 bottom-5 left-[1.4rem] w-px bg-border" aria-hidden />
          {sorted.map((e) => (
            <li key={e.seq} className="relative flex gap-3 py-2">
              <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-card bg-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{e.summary}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span>{e.actorName}</span>
                  <DateText at={e.at} />
                  <span className="font-mono" title={`hash ${e.hash}\nprev ${e.prevHash}`}>
                    #{e.seq} · {e.hash.slice(0, 10)}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
