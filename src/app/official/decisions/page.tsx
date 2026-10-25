"use client";

import { useMemo } from "react";
import { CheckCircle2, Gavel, XCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { caseColumns } from "@/components/tables/columns";
import { useDemoData } from "@/store/hooks";

export default function DecisionsPage() {
  const d = useDemoData();
  const columns = useMemo(() => caseColumns(d), [d]);
  const ready = useMemo(() => d.cases.filter((c) => c.status === "ready_for_decision"), [d]);
  const decided = useMemo(() => d.cases.filter((c) => ["approved", "rejected", "closed"].includes(c.status)), [d]);
  const decisions = d.audit.filter((e) => e.action === "decision.recorded");

  return (
    <PortalPage
      href="/official/decisions"
      stats={
        <>
          <StatCard label="Ready for authorised decision" value={ready.length} icon={Gavel} />
          <StatCard label="Decisions recorded" value={decisions.length} hint="From the audit chain" icon={CheckCircle2} tone="success" />
          <StatCard label="Rejected" value={d.cases.filter((c) => c.status === "rejected").length} icon={XCircle} />
          <StatCard label="Closed" value={d.cases.filter((c) => c.status === "closed").length} icon={CheckCircle2} />
        </>
      }
    >
      <Section title="Ready for authorised decision">
        <DataTable columns={columns} data={ready} emptyTitle="Nothing waiting for a decision" />
      </Section>
      <Section title="Decided">
        <DataTable columns={columns} data={decided} initialSorting={[{ id: "updated", desc: true }]} />
      </Section>
    </PortalPage>
  );
}
