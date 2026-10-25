"use client";

import { PageHeader } from "@/components/page-header";
import { MaturityRadar } from "@/components/official/maturity-radar";
import { useDemoData, useToday } from "@/store/hooks";

export default function MaturityPage() {
  const d = useDemoData();
  const today = useToday();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Maturity radar"
        description="Active instruments maturing in the next 90 days. Reminder horizons are product settings (demo configuration), not regulatory deadlines."
      />
      <MaturityRadar data={d} today={today} />
    </div>
  );
}
