"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINRCompact, formatINR } from "@/lib/money";
import { instrumentDisplayStatus } from "@/lib/status";
import { todayIST } from "@/lib/dates";
import { useDemoStore } from "@/store/demo-store";
import { Container } from "./primitives";

const OPEN_CASE = new Set(["open", "in_review", "awaiting_institution", "ready_for_decision"]);

/** Reads the same demo store the portals use, so actions taken in the demo show up here. */
export function LiveStats() {
  const data = useDemoStore((s) => (s.status === "ready" ? s.data : null));

  const stats = useMemo(() => {
    if (!data) return null;
    const today = todayIST();
    const tracked = data.instruments.filter((i) => i.status !== "archived");
    const activePaise = data.instruments.filter((i) => i.status === "active").reduce((s, i) => s + i.amountPaise, 0);
    const maturing = data.instruments.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length;
    const openCases = data.cases.filter((c) => OPEN_CASE.has(c.status)).length;
    return [
      { label: "Instruments tracked", value: String(tracked.length), hint: `across ${data.institutions.length} institutions` },
      { label: "Value under management", value: formatINRCompact(activePaise), hint: formatINR(activePaise, { whole: true }), title: formatINR(activePaise) },
      { label: "Maturing in 30 days", value: String(maturing), hint: "reminders scheduled" },
      { label: "Open cases", value: String(openCases), hint: "verification and release" },
    ];
  }, [data]);

  return (
    <section aria-label="Live demo statistics" className="border-t bg-card">
      <Container className="py-10 sm:py-12">
        <p className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-status-success opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-status-success" />
          </span>
          Live from the demo data · synthetic
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {(stats ?? Array.from({ length: 4 }, () => null)).map((s, i) => (
            <div key={s?.label ?? i} className="min-w-0 border-l pl-4">
              {s ? (
                <>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular sm:text-3xl" title={s.title}>
                    {s.value}
                  </dd>
                  <dd className="mt-0.5 truncate text-xs text-muted-foreground">{s.hint}</dd>
                </>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              )}
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
