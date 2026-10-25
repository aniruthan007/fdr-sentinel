"use client";

import { PageHeader } from "@/components/page-header";
import { AuditExplorer } from "@/components/official/audit-explorer";
import { useDemoData } from "@/store/hooks";

export default function AuditPage() {
  const d = useDemoData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description={`${d.audit.length} append-only events. Each event's SHA-256 hash covers its own fields and the previous event's hash, so editing any one breaks every link after it.`}
      />
      <AuditExplorer events={d.audit} />
    </div>
  );
}
