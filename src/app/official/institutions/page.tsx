"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, CircleDollarSign, MapPin, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/money-text";
import { PortalPage } from "@/components/portal-page";
import { StatCard } from "@/components/stat-card";
import { institutionColumns } from "@/components/tables/columns";
import { useDemoData } from "@/store/hooks";

/** Supports ?q= deep links from the ⌘K palette. */
export default function InstitutionsPage() {
  return (
    <Suspense>
      <InstitutionsPageInner />
    </Suspense>
  );
}

function InstitutionsPageInner() {
  const q = useSearchParams().get("q") ?? "";
  const d = useDemoData();
  const columns = useMemo(() => institutionColumns(d), [d]);
  const required = d.obligations.filter((o) => o.status !== "discharged").reduce((s, o) => s + o.requiredPaise, 0);

  return (
    <PortalPage
      href="/official/institutions"
      stats={
        <>
          <StatCard label="Institutions" value={d.institutions.length} icon={Building2} />
          <StatCard label="States" value={new Set(d.institutions.map((i) => i.state)).size} icon={MapPin} />
          <StatCard label="Obligations" value={d.obligations.length} hint={`${d.obligations.filter((o) => o.status === "secured").length} secured`} icon={ShieldCheck} />
          <StatCard label="Total required" value={<MoneyText paise={required} compact />} icon={CircleDollarSign} />
        </>
      }
    >
      <DataTable key={q} initialFilter={q} columns={columns} data={d.institutions} searchPlaceholder="Search institution or reference" />
    </PortalPage>
  );
}
