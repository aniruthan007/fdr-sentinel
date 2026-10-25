"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hourglass, Plus, ShieldCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { releaseColumns } from "@/components/tables/columns";
import { isOpenRelease, isReleaseApproved } from "@/lib/selectors";
import { useCan } from "@/hooks/use-command";
import { useDemoData, useSession } from "@/store/hooks";

export default function InstitutionReleasesPage() {
  const d = useDemoData();
  const router = useRouter();
  const session = useSession();
  const instId = session?.institutionId;
  const canSubmit = useCan("submitReleaseRequest", instId);

  const requests = useMemo(() => d.releaseRequests.filter((r) => r.institutionId === instId), [d, instId]);
  const open = requests.filter(isOpenRelease);
  const ids = new Set(requests.map((r) => r.id));
  const pending = d.clearances.filter((c) => ids.has(c.releaseRequestId) && ["pending", "further_info_required"].includes(c.status)).length;
  const columns = useMemo(() => releaseColumns(d, { institution: false, link: false }), [d]);

  return (
    <PortalPage
      href="/institution/releases"
      actions={
        canSubmit && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/institution/releases/new"><Plus className="size-3.5" /> New release request</Link>
          </Button>
        )
      }
      stats={
        <>
          <StatCard label="Open requests" value={open.length} icon={Undo2} />
          <StatCard label="Amount in release" value={<MoneyText paise={open.reduce((s, r) => s + r.totalPaise, 0)} compact />} icon={Hourglass} />
          <StatCard label="Clearances outstanding" value={pending} hint="Across open requests" icon={ShieldCheck} tone={pending ? "warning" : "default"} />
          <StatCard label="Approved" value={requests.filter((r) => isReleaseApproved(d, r)).length} icon={CheckCircle2} tone="success" />
        </>
      }
    >
      <DataTable
        columns={columns}
        data={requests}
        onRowClick={(r) => router.push(`/institution/releases/${r.id}`)}
        initialSorting={[{ id: "submitted", desc: true }]}
        emptyTitle="No release requests yet"
        emptyDescription="When a deposit is no longer needed you can request its release here."
      />
    </PortalPage>
  );
}
