"use client";

import { useMemo } from "react";
import { CalendarClock, Gavel, ListChecks, ScrollText, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { caseColumns, clearanceColumns } from "@/components/tables/columns";
import { ROLE_LABELS } from "@/lib/authz";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoData, useSession, useToday } from "@/store/hooks";

const ACTIVE = ["open", "in_review", "awaiting_institution", "ready_for_decision"];

export default function OfficialOverviewPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const role = session?.role;

  const activeCases = useMemo(() => d.cases.filter((c) => ACTIVE.includes(c.status)), [d]);
  const ready = activeCases.filter((c) => c.status === "ready_for_decision");
  // Brief §2.1: clearance officers see only their assigned clearances.
  const pendingClearances = useMemo(
    () =>
      d.clearances.filter(
        (c) => ["pending", "further_info_required"].includes(c.status) && (role !== "clearance_officer" || c.assignedTo === session?.userId),
      ),
    [d, role, session],
  );
  const maturing = d.instruments.filter((i) => ["near_maturity", "matured"].includes(instrumentDisplayStatus(i, today))).length;
  const caseCols = useMemo(() => caseColumns(d), [d]);
  const clrCols = useMemo(() => clearanceColumns(d), [d]);

  // Each role's queue: what this person is expected to act on next.
  const queue =
    role === "approver" ? ready : role === "processing_officer" ? activeCases.filter((c) => c.status !== "ready_for_decision") : activeCases;

  return (
    <PortalPage
      href="/official"
      stats={
        role === "clearance_officer" ? (
          <>
            <StatCard label="Clearances outstanding" value={pendingClearances.length} icon={ShieldCheck} tone={pendingClearances.length ? "warning" : "default"} href="/official/clearances" />
            <StatCard label="Assigned to you" value={d.clearances.filter((c) => c.assignedTo === session?.userId).length} hint="All sources SIMULATED" icon={ListChecks} href="/official/clearances" />
          </>
        ) : (
        <>
          <StatCard label="Active cases" value={activeCases.length} hint={`${activeCases.filter((c) => !c.assigneeId).length} unassigned`} icon={ListChecks} href="/official/cases" />
          <StatCard label="Ready for authorised decision" value={ready.length} icon={Gavel} href="/official/decisions" />
          <StatCard label="Clearances outstanding" value={pendingClearances.length} icon={ShieldCheck} tone={pendingClearances.length ? "warning" : "default"} href="/official/clearances" />
          {role === "auditor" ? (
            <StatCard label="Audit events" value={d.audit.length} hint="SHA-256 hash-chained" icon={ScrollText} href="/official/audit" />
          ) : (
            <StatCard label="Maturing ≤ 30 days" value={maturing} hint="Across all institutions" icon={CalendarClock} tone={maturing ? "warning" : "default"} href="/official/maturity" />
          )}
        </>
        )
      }
    >
      {role === "clearance_officer" ? (
        <Section title="Your queue · outstanding clearances">
          <DataTable columns={clrCols} data={pendingClearances} emptyTitle="No clearances outstanding" />
        </Section>
      ) : (
        <Section title={`Your queue · ${role ? ROLE_LABELS[role] : ""}`}>
          <DataTable columns={caseCols} data={queue} initialSorting={[{ id: "updated", desc: true }]} emptyTitle="Queue is clear" />
        </Section>
      )}
    </PortalPage>
  );
}
