import { FlaskConical } from "lucide-react";

/** Required on every page (CLAUDE.md §3.12). Not dismissible. */
export function PrototypeBanner() {
  return (
    <div
      role="note"
      className="flex min-h-8 items-center justify-center gap-2 border-b border-status-warning-border bg-status-warning-bg px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.08em] text-status-warning uppercase"
    >
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span>Prototype · Demo data — not connected to AICTE or any bank</span>
    </div>
  );
}
