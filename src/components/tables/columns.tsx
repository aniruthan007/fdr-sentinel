"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GitBranch } from "lucide-react";
import { DateText } from "@/components/date-text";
import { IdText } from "@/components/id-text";
import { MoneyText } from "@/components/money-text";
import { StatusBadge } from "@/components/status-badge";
import { ROLE_LABELS } from "@/lib/authz";
import { instrumentDisplayStatus } from "@/lib/status";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { CLEARANCE_DEPARTMENT_LABELS } from "@/data/releases";
import { demoUser } from "@/data/people";
import type { DemoData } from "@/data/seed";
import type {
  AuditEvent,
  ClearanceRecord,
  DepositObligation,
  DocumentRecord,
  FinancialInstrument,
  ISODate,
  Institution,
  ObligationKind,
  ReleaseRequest,
  VerificationCase,
} from "@/types";

export const OBLIGATION_KIND_LABELS: Record<ObligationKind, string> = {
  establishment: "Establishment",
  intake_increase: "Intake increase",
  new_programme: "New programme",
};

const CASE_TYPE_LABELS: Record<VerificationCase["type"], string> = {
  deposit_verification: "Deposit verification",
  release: "Release",
  renewal: "Renewal",
};

function institutionName(d: DemoData, id: string) {
  return d.institutions.find((i) => i.id === id)?.shortName ?? id;
}

export function userName(id: string | null): string {
  if (!id) return "—";
  return demoUser(id)?.name ?? (id.startsWith("ext-") ? "Institution user" : id);
}

export function instrumentColumns(d: DemoData, today: ISODate, opts: { institution?: boolean } = {}): ColumnDef<FinancialInstrument>[] {
  const cols: ColumnDef<FinancialInstrument>[] = [
    {
      id: "instrumentNo",
      header: "Instrument",
      accessorFn: (r) => `${r.instrumentNo} ${r.bankName}`,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <IdText value={r.instrumentNo} />
          <p className="text-xs text-muted-foreground">
            {r.type} · {r.bankName}
          </p>
        </div>
      ),
    },
  ];
  if (opts.institution) {
    cols.push({ id: "institution", header: "Institution", accessorFn: (r) => institutionName(d, r.institutionId) });
  }
  cols.push(
    { id: "amount", header: "Amount", accessorFn: (r) => r.amountPaise, cell: ({ row }) => <MoneyText paise={row.original.amountPaise} /> },
    {
      id: "maturity",
      header: "Maturity",
      accessorFn: (r) => r.maturityDate ?? "9999-12-31",
      cell: ({ row }) => <DateText date={row.original.maturityDate} relative={row.original.status === "active"} />,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => instrumentDisplayStatus(r, today),
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={instrumentDisplayStatus(r, today)} />
          {r.predecessorInstrumentId && (
            <span title="Renewal of an earlier instrument" className="text-muted-foreground">
              <GitBranch className="size-3.5" aria-label="Has predecessor" />
            </span>
          )}
        </div>
      ),
    },
  );
  return cols;
}

export function obligationColumns(d: DemoData): ColumnDef<DepositObligation>[] {
  return [
    { id: "kind", header: "Obligation", accessorFn: (r) => OBLIGATION_KIND_LABELS[r.kind], cell: ({ row: { original: r } }) => (
      <div>
        <p className="font-medium">{OBLIGATION_KIND_LABELS[r.kind]}</p>
        <p className="text-xs text-muted-foreground">AY {r.academicYear}</p>
      </div>
    ) },
    { id: "required", header: "Required", accessorFn: (r) => r.requiredPaise, cell: ({ row }) => <MoneyText paise={row.original.requiredPaise} /> },
    {
      id: "covered",
      header: "Active cover",
      accessorFn: (r) => d.instruments.filter((i) => i.obligationId === r.id && i.status === "active").reduce((s, i) => s + i.amountPaise, 0),
      cell: ({ getValue }) => <MoneyText paise={getValue() as number} />,
    },
    { id: "instruments", header: "Instruments", accessorFn: (r) => d.instruments.filter((i) => i.obligationId === r.id && i.status !== "replaced").length, cell: ({ getValue }) => <span className="tabular">{getValue() as number}</span> },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];
}

export function caseColumns(d: DemoData, opts: { institution?: boolean } = { institution: true }): ColumnDef<VerificationCase>[] {
  const cols: ColumnDef<VerificationCase>[] = [
    {
      id: "ref",
      header: "Case",
      accessorFn: (r) => `${r.ref} ${r.title}`,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <IdText value={r.ref} />
          <p className="max-w-xs truncate text-xs text-muted-foreground" title={r.title}>{r.title}</p>
        </div>
      ),
    },
    { id: "type", header: "Type", accessorFn: (r) => CASE_TYPE_LABELS[r.type] },
  ];
  if (opts.institution) cols.push({ id: "institution", header: "Institution", accessorFn: (r) => institutionName(d, r.institutionId) });
  cols.push(
    { id: "findings", header: "Findings", accessorFn: (r) => d.findings.filter((f) => f.caseId === r.id && f.status !== "resolved").length, cell: ({ getValue }) => <span className="tabular">{getValue() as number}</span> },
    { id: "updated", header: "Updated", accessorFn: (r) => r.updatedAt, cell: ({ row }) => <DateText at={row.original.updatedAt} relative /> },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  );
  return cols;
}

export function releaseColumns(d: DemoData, opts: { institution?: boolean } = { institution: true }): ColumnDef<ReleaseRequest>[] {
  const cols: ColumnDef<ReleaseRequest>[] = [
    { id: "ref", header: "Request", accessorFn: (r) => r.ref, cell: ({ row }) => <IdText value={row.original.ref} /> },
  ];
  if (opts.institution) cols.push({ id: "institution", header: "Institution", accessorFn: (r) => institutionName(d, r.institutionId) });
  cols.push(
    { id: "amount", header: "Amount", accessorFn: (r) => r.totalPaise, cell: ({ row }) => <MoneyText paise={row.original.totalPaise} /> },
    {
      id: "clearances",
      header: "Clearances",
      accessorFn: (r) => {
        const all = d.clearances.filter((c) => c.releaseRequestId === r.id);
        return `${all.filter((c) => c.status === "cleared" || c.status === "not_applicable").length} / ${all.length}`
      },
      cell: ({ getValue }) => <span className="font-mono tabular text-sm">{getValue() as string}</span>,
    },
    { id: "submitted", header: "Submitted", accessorFn: (r) => r.submittedAt, cell: ({ row }) => <DateText at={row.original.submittedAt} /> },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  );
  return cols;
}

export function clearanceColumns(d: DemoData): ColumnDef<ClearanceRecord>[] {
  return [
    { id: "request", header: "Request", accessorFn: (r) => d.releaseRequests.find((x) => x.id === r.releaseRequestId)?.ref ?? "", cell: ({ getValue }) => <IdText value={getValue() as string} /> },
    { id: "institution", header: "Institution", accessorFn: (r) => institutionName(d, d.releaseRequests.find((x) => x.id === r.releaseRequestId)?.institutionId ?? "") },
    {
      id: "department",
      header: "Department",
      accessorFn: (r) => CLEARANCE_DEPARTMENT_LABELS[r.department],
      cell: ({ row: { original: r } }) => (
        <span className="inline-flex items-center gap-1.5">
          {CLEARANCE_DEPARTMENT_LABELS[r.department]}
          <span className="rounded border border-dashed px-1 font-mono text-[10px] text-muted-foreground" title="Mock adapter — no real department system is connected">
            {r.source}
          </span>
        </span>
      ),
    },
    { id: "recorded", header: "Recorded", accessorFn: (r) => r.recordedAt ?? "", cell: ({ row }) => (row.original.recordedAt ? <DateText at={row.original.recordedAt} /> : <span className="text-muted-foreground">—</span>) },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];
}

export function documentColumns(d: DemoData): ColumnDef<DocumentRecord>[] {
  return [
    {
      id: "file",
      header: "Document",
      accessorFn: (r) => r.fileName,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <p className="max-w-xs truncate font-medium" title={r.fileName}>{r.fileName}</p>
          <p className="text-xs text-muted-foreground">{DOCUMENT_KIND_LABELS[r.kind]}</p>
        </div>
      ),
    },
    { id: "instrument", header: "Instrument", accessorFn: (r) => d.instruments.find((i) => i.id === r.instrumentId)?.instrumentNo ?? "—", cell: ({ getValue }) => <span className="font-mono text-[0.8125rem]">{getValue() as string}</span> },
    { id: "fields", header: "Fields confirmed", accessorFn: (r) => {
      const ext = d.extractions.filter((e) => e.documentId === r.id);
      return ext.length ? `${ext.filter((e) => e.confirmedAt).length} / ${ext.length}` : "—";
    }, cell: ({ getValue }) => <span className="font-mono tabular text-sm">{getValue() as string}</span> },
    { id: "uploaded", header: "Uploaded", accessorFn: (r) => r.uploadedAt, cell: ({ row }) => <DateText at={row.original.uploadedAt} /> },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];
}

export function institutionColumns(d: DemoData): ColumnDef<Institution>[] {
  return [
    {
      id: "name",
      header: "Institution",
      accessorFn: (r) => `${r.name} ${r.refCode}`,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.type} · {r.city}, {r.state}
          </p>
        </div>
      ),
    },
    { id: "ref", header: "Reference", accessorFn: (r) => r.refCode, cell: ({ row }) => <IdText value={row.original.refCode} /> },
    { id: "required", header: "Required", accessorFn: (r) => d.obligations.filter((o) => o.institutionId === r.id && o.status !== "discharged").reduce((s, o) => s + o.requiredPaise, 0), cell: ({ getValue }) => <MoneyText paise={getValue() as number} compact /> },
    { id: "covered", header: "Active cover", accessorFn: (r) => d.instruments.filter((i) => i.institutionId === r.id && i.status === "active").reduce((s, i) => s + i.amountPaise, 0), cell: ({ getValue }) => <MoneyText paise={getValue() as number} compact /> },
    { id: "openCases", header: "Open cases", accessorFn: (r) => d.cases.filter((c) => c.institutionId === r.id && !["approved", "rejected", "closed"].includes(c.status)).length, cell: ({ getValue }) => <span className="tabular">{getValue() as number}</span> },
  ];
}

export function auditColumns(): ColumnDef<AuditEvent>[] {
  return [
    { id: "seq", header: "#", accessorFn: (r) => r.seq, cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground tabular">{getValue() as number}</span> },
    { id: "at", header: "When (IST)", accessorFn: (r) => r.at, cell: ({ row }) => <DateText at={row.original.at} /> },
    {
      id: "actor",
      header: "Actor",
      accessorFn: (r) => r.actorName,
      cell: ({ row: { original: r } }) => (
        <div>
          <p className="text-sm">{r.actorName}</p>
          <p className="text-xs text-muted-foreground">{r.actorRole === "system" ? "System" : ROLE_LABELS[r.actorRole]}</p>
        </div>
      ),
    },
    {
      id: "summary",
      header: "Event",
      accessorFn: (r) => `${r.action} ${r.summary}`,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{r.action}</p>
          <p className="max-w-md truncate text-sm" title={r.summary}>{r.summary}</p>
        </div>
      ),
    },
    { id: "hash", header: "Hash", accessorFn: (r) => r.hash, enableSorting: false, cell: ({ row }) => <IdText value={row.original.hash} truncate={12} /> },
  ];
}
