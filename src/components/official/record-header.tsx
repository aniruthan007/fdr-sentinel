"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import type { ReleaseStatus } from "@/types";

export function RecordHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  badges,
  meta,
  actions,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: React.ReactNode;
  title: string;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {backLabel}
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{eyebrow}</p>
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
          {badges && <div className="flex flex-wrap items-center gap-2 pt-1">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-soft sm:grid-cols-4">{meta}</dl>}
    </header>
  );
}

export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate">{children}</dd>
    </div>
  );
}

/** The happy path of brief §7.3. Side states (returned, on hold, awaiting response) are shown as a note. */
const PATH: ReleaseStatus[] = [
  "submitted",
  "completeness_review",
  "in_verification",
  "awaiting_clearances",
  "ready_for_decision",
  "approved",
  "closed",
];

export function ReleaseStepper({ status }: { status: ReleaseStatus }) {
  const idx = status === "rejected" ? PATH.indexOf("approved") : PATH.indexOf(status);
  const off = idx === -1;
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-soft">
      <ol className="flex items-center gap-1 overflow-x-auto" aria-label="Release request progress (brief §7.3)">
        {PATH.map((s, i) => {
          const label = s === "approved" && status === "rejected" ? "Rejected" : s === "approved" ? "Decision" : STATUS_META[s].label;
          const done = !off && i < idx;
          const current = !off && i === idx;
          return (
            <li key={s} className="flex shrink-0 items-center gap-1">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap",
                  done && "border-transparent bg-accent text-accent-foreground",
                  current && (status === "rejected" ? "border-status-danger-border bg-status-danger-bg font-medium text-status-danger" : "border-primary/50 bg-primary text-primary-foreground font-medium"),
                  !done && !current && "text-muted-foreground",
                )}
              >
                {done && <Check className="size-3" aria-hidden />}
                {label}
              </span>
              {i < PATH.length - 1 && <span className={cn("h-px w-3 shrink-0", done ? "bg-primary/50" : "bg-border")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      {off && <p className="mt-2 text-xs text-status-warning">Currently: {STATUS_META[status].label}</p>}
    </div>
  );
}

export function suggestedDecisionRef(kind: "VER" | "REN" | "REL", ref: string): string {
  const [, year, n] = ref.split("-");
  return `DC/${kind}/${year}/${n}`;
}
