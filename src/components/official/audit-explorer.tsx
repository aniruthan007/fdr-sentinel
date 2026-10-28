"use client";

import { useMemo, useState } from "react";
import { CircleCheck, FlaskConical, OctagonAlert, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyChain, type ChainVerdict } from "@/lib/audit-chain";
import { ROLE_LABELS } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DateText } from "@/components/date-text";
import { IdText } from "@/components/id-text";
import type { AuditEvent } from "@/types";

type RowState = "verified" | "broken" | "untrusted" | null;

/**
 * Signature moment 5. "Verify integrity" re-hashes the stored chain. "Simulate tampering" edits one
 * event in a copy and re-verifies, showing exactly where the chain breaks. The stored chain is never
 * modified — audit events are append-only.
 */
export function AuditExplorer({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState("");
  const [tamperSeq, setTamperSeq] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<(ChainVerdict & { ms: number; simulated: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [openSeq, setOpenSeq] = useState<number | null>(null);

  const chain = useMemo(() => {
    if (tamperSeq === null) return events;
    return events.map((e) => (e.seq === tamperSeq ? { ...e, summary: `${e.summary} (edited after the fact)` } : e));
  }, [events, tamperSeq]);

  async function verify(target: AuditEvent[], simulated: boolean) {
    setBusy(true);
    const t0 = performance.now();
    const v = await verifyChain(target);
    setVerdict({ ...v, ms: Math.max(1, Math.round(performance.now() - t0)), simulated });
    setBusy(false);
  }

  async function tamper(seq: number) {
    setTamperSeq(seq);
    setOpenSeq(null);
    await verify(events.map((e) => (e.seq === seq ? { ...e, summary: `${e.summary} (edited after the fact)` } : e)), true);
  }

  async function restore() {
    setTamperSeq(null);
    await verify(events, false);
  }

  const stateOf = (seq: number): RowState => {
    if (!verdict) return null;
    if (verdict.ok) return "verified";
    if (seq < verdict.brokenAtSeq) return "verified";
    return seq === verdict.brokenAtSeq ? "broken" : "untrusted";
  };

  const q = query.trim().toLowerCase();
  const rows = [...chain]
    .filter((e) => !q || `${e.action} ${e.summary} ${e.actorName} ${e.entityId}`.toLowerCase().includes(q))
    .sort((a, b) => b.seq - a.seq);
  const open = chain.find((e) => e.seq === openSeq);
  const defaultTarget = events[Math.floor(events.length / 2)]?.seq ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => verify(chain, tamperSeq !== null)} disabled={busy} className="gap-1.5">
            <ShieldCheck className="size-4" /> Verify integrity
          </Button>
          {tamperSeq === null ? (
            <Button variant="outline" onClick={() => tamper(defaultTarget)} disabled={busy || events.length === 0} className="gap-1.5">
              <FlaskConical className="size-4" /> Simulate tampering
            </Button>
          ) : (
            <Button variant="outline" onClick={restore} disabled={busy} className="gap-1.5">
              <RotateCcw className="size-4" /> Restore original
            </Button>
          )}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actor, action, record" className="h-9 pl-8" aria-label="Search audit events" />
        </div>
      </div>

      {tamperSeq !== null && (
        <p className="flex items-start gap-2 rounded-lg border border-dashed border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Simulation: event #{tamperSeq}&apos;s summary was edited in a copy of the chain. The stored chain is never modified — audit
          events are append-only. This browser-held chain is tamper-evident only: someone who rewrites every later hash would not be
          detected without an independent anchor.
        </p>
      )}

      <div aria-live="polite">
        {verdict &&
          (verdict.ok ? (
            <div className="flex items-start gap-3 rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success">
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Chain intact</p>
                <p className="text-xs opacity-90">
                  {verdict.checked} events re-hashed with SHA-256 in {verdict.ms} ms. Every hash matches its contents and links to the one before.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
              <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Chain broken at event #{verdict.brokenAtSeq}</p>
                <p className="text-xs opacity-90">
                  {verdict.reason === "hash_mismatch"
                    ? "Its stored hash no longer matches its contents."
                    : "It no longer links to the hash of the event before it."}{" "}
                  {verdict.checked} earlier events verified; every event after #{verdict.brokenAtSeq} can no longer be trusted.
                </p>
              </div>
            </div>
          ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">When (IST)</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">prev → hash</th>
                <th className="w-24 px-3 py-2 font-medium">Integrity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const st = stateOf(e.seq);
                return (
                  <tr
                    key={e.seq}
                    onClick={() => setOpenSeq(e.seq)}
                    className={cn(
                      "cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50",
                      st === "broken" && "bg-status-danger-bg hover:bg-status-danger-bg",
                      st === "untrusted" && "opacity-55",
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground tabular">{e.seq}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap"><DateText at={e.at} /></td>
                    <td className="px-3 py-2">
                      <p className="text-sm">{e.actorName}</p>
                      <p className="text-[11px] text-muted-foreground">{e.actorRole === "system" ? "System" : ROLE_LABELS[e.actorRole]}</p>
                    </td>
                    <td className="max-w-[22rem] px-3 py-2">
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setOpenSeq(e.seq); }} className="block max-w-full text-left">
                        <span className="block font-mono text-[11px] text-muted-foreground">{e.action}</span>
                        <span className={cn("block truncate", st === "broken" && "font-medium text-status-danger")}>{e.summary}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                      {e.prevHash.slice(0, 6)} → <span className="text-foreground">{e.hash.slice(0, 6)}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {st === "verified" && <span className="flex items-center gap-1 text-status-success"><CircleCheck className="size-3.5" aria-hidden /> Verified</span>}
                      {st === "broken" && <span className="flex items-center gap-1 font-medium text-status-danger"><OctagonAlert className="size-3.5" aria-hidden /> Broken</span>}
                      {st === "untrusted" && <span className="text-muted-foreground">Untrusted</span>}
                      {st === null && <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No events match “{query}”.</p>}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenSeq(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>Event #{open.seq}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{open.action}</SheetDescription>
              </SheetHeader>
              <dl className="space-y-3 px-4 pb-6 text-sm">
                {[
                  ["Summary", open.summary],
                  ["Actor", `${open.actorName} · ${open.actorRole === "system" ? "System" : ROLE_LABELS[open.actorRole]}`],
                  ["Record", `${open.entityType} · ${open.entityId}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-muted-foreground">When</dt>
                  <dd><DateText at={open.at} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Previous hash</dt>
                  <dd><IdText value={open.prevHash} truncate={24} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Hash (SHA-256 of the fields above + previous hash)</dt>
                  <dd><IdText value={open.hash} truncate={24} /></dd>
                </div>
                {Object.keys(open.payload).length > 0 && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Payload</dt>
                    <dd>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 font-mono text-[11px]">{JSON.stringify(open.payload, null, 2)}</pre>
                    </dd>
                  </div>
                )}
                {tamperSeq === null && (
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => tamper(open.seq)}>
                    <FlaskConical className="size-3.5" /> Simulate editing this event
                  </Button>
                )}
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
