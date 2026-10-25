"use client";

import { Construction } from "lucide-react";
import { navItemFor } from "@/lib/nav";
import { PageHeader } from "./page-header";

interface PortalPageProps {
  /** Nav href this page renders; title, summary and roadmap phase come from the nav config. */
  href: string;
  stats?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Phase-1 page frame: real counts and a real table from the demo store,
 * with a note saying which roadmap phase builds the full workspace.
 */
export function PortalPage({ href, stats, actions, children }: PortalPageProps) {
  const item = navItemFor(href);
  return (
    <div className="space-y-6">
      <PageHeader title={item?.label ?? ""} description={item?.summary} actions={actions} />
      {stats && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats}</div>}
      {children}
      {item && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Construction className="size-3.5" aria-hidden />
          Counts and rows are live from the demo store. The full workspace for this page arrives in Phase {item.phase}.
        </p>
      )}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
