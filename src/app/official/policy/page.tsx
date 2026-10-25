"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BookCheck, FileWarning, ListChecks, Scale } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { DateText } from "@/components/date-text";
import { IdText } from "@/components/id-text";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { useDemoData } from "@/store/hooks";
import type { ChecklistKind, ChecklistRequirement, PolicyRule } from "@/types";

const CHECKLIST_LABELS: Record<ChecklistKind, string> = {
  annexure_1: "Annexure-1 · Deposit verification",
  annexure_2: "Annexure-2 · Renewal",
  clause_6_46: "Clause 6.46 · Release",
};

function Provenance({ value }: { value: "demo_config" | "verified" }) {
  return value === "verified" ? (
    <span className="text-xs text-status-success">Verified</span>
  ) : (
    <span className="rounded border border-dashed border-status-warning-border px-1.5 py-0.5 text-[11px] font-medium text-status-warning" title="Placeholder pending verification against the handbook">
      DEMO CONFIG
    </span>
  );
}

const ruleColumns: ColumnDef<PolicyRule>[] = [
  { id: "code", header: "Rule", accessorFn: (r) => `${r.code} ${r.title}`, cell: ({ row: { original: r } }) => (
    <div className="min-w-0">
      <IdText value={r.code} />
      <p className="text-sm">{r.title}</p>
    </div>
  ) },
  { id: "source", header: "Source", accessorFn: (r) => r.sourceClause, cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
  { id: "version", header: "Ver.", accessorFn: (r) => r.version, cell: ({ getValue }) => <span className="font-mono text-xs">v{getValue() as number}</span> },
  { id: "effective", header: "Effective from", accessorFn: (r) => r.effectiveFrom, cell: ({ row }) => <DateText date={row.original.effectiveFrom} /> },
  { id: "provenance", header: "Provenance", accessorFn: (r) => r.provenance, cell: ({ row }) => <Provenance value={row.original.provenance} /> },
];

const requirementColumns: ColumnDef<ChecklistRequirement>[] = [
  { id: "code", header: "Item", accessorFn: (r) => `${r.code} ${r.label}`, cell: ({ row: { original: r } }) => (
    <div className="min-w-0">
      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
      <p className="text-sm">{r.label}</p>
    </div>
  ) },
  { id: "checklist", header: "Checklist", accessorFn: (r) => CHECKLIST_LABELS[r.checklist] },
  { id: "source", header: "Source", accessorFn: (r) => r.sourceClause, cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
  { id: "provenance", header: "Provenance", accessorFn: (r) => r.provenance, cell: ({ row }) => <Provenance value={row.original.provenance} /> },
];

export default function PolicyPage() {
  const d = useDemoData();
  const checklists = useMemo(() => new Set(d.checklistRequirements.map((r) => r.checklist)).size, [d]);
  const unverified = d.policyRules.filter((r) => r.provenance === "demo_config").length + d.checklistRequirements.filter((r) => r.provenance === "demo_config").length;

  return (
    <PortalPage
      href="/official/policy"
      stats={
        <>
          <StatCard label="Policy rules" value={d.policyRules.length} icon={Scale} />
          <StatCard label="Checklists" value={checklists} hint="Kept separate and conditional" icon={BookCheck} />
          <StatCard label="Checklist items" value={d.checklistRequirements.length} icon={ListChecks} />
          <StatCard label="Awaiting verification" value={unverified} hint="See docs/open-questions.md" icon={FileWarning} tone="warning" />
        </>
      }
    >
      <Section title="Policy rules">
        <DataTable columns={ruleColumns} data={d.policyRules} />
      </Section>
      <Section title="Checklist requirements">
        <DataTable columns={requirementColumns} data={d.checklistRequirements} />
      </Section>
    </PortalPage>
  );
}
