"use client";

import { useMemo } from "react";
import { Download, Percent, Landmark, Timer, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage, Section } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { institutionColumns } from "@/components/tables/columns";
import { coverInForce } from "@/lib/coverage";
import { downloadCsv, toCsv } from "@/lib/csv";
import { todayIST } from "@/lib/dates";
import { isReleaseApproved } from "@/lib/selectors";
import { instrumentDisplayStatus, STATUS_META } from "@/lib/status";
import { useDemoData, useToday } from "@/store/hooks";

export default function ReportsPage() {
  const d = useDemoData();
  const today = useToday();
  const columns = useMemo(() => institutionColumns(d, today), [d, today]);
  const required = d.obligations.filter((o) => o.status !== "discharged").reduce((s, o) => s + o.requiredPaise, 0);
  // Date-based: an accepted successor counts from its effective date; the instrument it replaces counts until then.
  const covered = coverInForce(d, today);
  const coverage = required ? Math.round((covered / required) * 1000) / 10 : 0;
  const released = d.releaseRequests.filter((r) => isReleaseApproved(d, r) && r.decidedAt);
  const avgDays = released.length
    ? Math.round(released.reduce((s, r) => s + (Date.parse(r.decidedAt!) - Date.parse(r.submittedAt)) / 86_400_000, 0) / released.length)
    : null;
  const inst = (id: string) => d.institutions.find((i) => i.id === id);

  function exportInstruments() {
    const rows = d.instruments.map((i) => ({
      institution: inst(i.institutionId)?.name ?? "",
      institution_ref: inst(i.institutionId)?.refCode ?? "",
      type: i.type,
      instrument_no: i.instrumentNo,
      bank: i.bankName,
      amount_inr: (i.amountPaise / 100).toFixed(2),
      issue_date: i.issueDate,
      maturity_date: i.maturityDate,
      status: STATUS_META[instrumentDisplayStatus(i, today)].label,
      predecessor: d.instruments.find((p) => p.id === i.predecessorInstrumentId)?.instrumentNo ?? "",
    }));
    downloadCsv(`deposit-docket-instruments-${todayIST()}.csv`, toCsv(rows));
  }

  function exportReleases() {
    const rows = d.releaseRequests.map((r) => {
      const c = d.cases.find((x) => x.id === r.caseId);
      return {
        request: r.ref,
        institution: inst(r.institutionId)?.name ?? "",
        amount_inr: (r.totalPaise / 100).toFixed(2),
        status: STATUS_META[r.status].label,
        submitted_at: r.submittedAt,
        decision: c?.decision?.outcome ?? "",
        decision_reference: c?.decision?.referenceNo ?? "",
        decided_at: r.decidedAt,
        clearances_recorded: `${d.clearances.filter((x) => x.releaseRequestId === r.id && ["cleared", "not_applicable"].includes(x.status)).length}/${d.clearances.filter((x) => x.releaseRequestId === r.id).length}`,
      };
    });
    downloadCsv(`deposit-docket-release-requests-${todayIST()}.csv`, toCsv(rows));
  }

  return (
    <PortalPage
      href="/official/reports"
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportInstruments}>
            <Download className="size-3.5" /> Instruments CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportReleases}>
            <Download className="size-3.5" /> Release requests CSV
          </Button>
        </>
      }
      stats={
        <>
          <StatCard label="Coverage" value={`${coverage}%`} hint="Active cover ÷ required" icon={Percent} />
          <StatCard label="Cover in force today" value={<MoneyText paise={covered} compact />} icon={Landmark} />
          <StatCard label="Approved for release" value={<MoneyText paise={released.reduce((s, r) => s + r.totalPaise, 0)} compact />} hint={`${released.length} request(s)`} icon={Undo2} />
          <StatCard label="Avg. release turnaround" value={avgDays === null ? "—" : `${avgDays} d`} hint="Submission → decision" icon={Timer} />
        </>
      }
    >
      <Section title="Coverage by institution">
        <DataTable columns={columns} data={d.institutions} />
      </Section>
    </PortalPage>
  );
}
