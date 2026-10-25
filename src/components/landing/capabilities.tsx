"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CircleDashed, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyChain } from "@/lib/audit-chain";
import { daysBetween, todayIST } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoStore } from "@/store/demo-store";
import type { DemoData } from "@/data/seed";
import { LandingSection, Reveal } from "./primitives";

function useLiveData(): DemoData | null {
  return useDemoStore((s) => (s.status === "ready" ? s.data : null));
}

function Card({ title, body, live, children }: { title: string; body: string; live?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft">
      <div className="flex h-52 flex-col justify-center border-b bg-muted/40 p-4">{children}</div>
      <div className="space-y-1 p-5">
        <h3 className="flex items-center gap-2 font-semibold tracking-tight">
          {title}
          {live && (
            <span className="rounded border border-status-success-border bg-status-success-bg px-1.5 py-px text-[10px] font-medium text-status-success">
              LIVE DATA
            </span>
          )}
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

// 1 — Evidence-linked extraction --------------------------------------------------------------

const REGIONS = [
  { key: "no", label: "FDR no.", value: "NGB/FDR/2026/7731045", conf: 98, box: "top-[18%] left-[52%] w-[40%]" },
  { key: "amount", label: "Amount", value: "₹20,00,000.00", conf: 94, box: "top-[42%] left-[8%] w-[42%]" },
  { key: "maturity", label: "Maturity", value: "19 Sep 2027", conf: 88, box: "top-[62%] left-[52%] w-[34%]" },
] as const;

function ExtractionFragment() {
  const [active, setActive] = useState<string>("amount");
  const current = REGIONS.find((r) => r.key === active)!;
  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
      <div className="relative rounded-md border bg-card p-2.5" aria-hidden>
        <div className="h-2 w-1/2 rounded bg-muted-foreground/25" />
        <div className="mt-3 ml-auto h-1.5 w-2/5 rounded bg-muted-foreground/15" />
        <div className="mt-4 h-1.5 w-3/4 rounded bg-muted-foreground/15" />
        <div className="mt-3 h-2.5 w-2/5 rounded bg-muted-foreground/25" />
        <div className="mt-4 h-1.5 w-1/3 rounded bg-muted-foreground/15" />
        <div className="mt-2 ml-auto h-1.5 w-1/3 rounded bg-muted-foreground/15" />
        <div className="mt-4 h-1.5 w-2/3 rounded bg-muted-foreground/15" />
        {REGIONS.map((r) => (
          <span
            key={r.key}
            className={cn(
              "absolute h-[14%] rounded-sm border-2 transition-all duration-200",
              r.box,
              active === r.key ? "border-primary bg-primary/10" : "border-transparent",
            )}
          />
        ))}
      </div>
      <div className="flex flex-col justify-center gap-1.5">
        {REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onMouseEnter={() => setActive(r.key)}
            onFocus={() => setActive(r.key)}
            onClick={() => setActive(r.key)}
            className={cn(
              "rounded-md border px-2 py-1 text-left transition-colors",
              active === r.key ? "border-primary/40 bg-accent" : "bg-card hover:bg-accent/50",
            )}
          >
            <span className="flex items-center justify-between text-[10px] text-muted-foreground">
              {r.label}
              <span className={cn("tabular", r.conf < 90 && "text-status-warning")}>{r.conf}%</span>
            </span>
            <span className="block truncate font-mono text-[11px]">{r.value}</span>
          </button>
        ))}
        <p className="text-[10px] text-muted-foreground">Page 1 · {current.label} region highlighted</p>
      </div>
    </div>
  );
}

// 2 — Discrepancy detection -------------------------------------------------------------------

function DiscrepancyFragment() {
  const rows = [
    { field: "Amount", declared: "₹25,00,000", extracted: "₹20,00,000", record: "₹25,00,000", state: "bad" },
    { field: "Maturity", declared: "19 Oct 2027", extracted: "19 Sep 2027", record: "—", state: "warn" },
    { field: "FDR no.", declared: "…/7731045", extracted: "…/7731045", record: "…/7731045", state: "ok" },
  ] as const;
  return (
    <div className="overflow-hidden rounded-md border bg-card text-[10.5px]">
      <div className="grid grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] gap-px bg-border">
        {["", "Declared", "Extracted", "On record"].map((h) => (
          <div key={h} className="bg-muted px-1.5 py-1.5 font-medium text-muted-foreground">
            {h}
          </div>
        ))}
        {rows.map((r) => (
          <div key={r.field} className="contents">
            <div className="bg-card px-1.5 py-1.5 text-muted-foreground">{r.field}</div>
            <div className="truncate bg-card px-1.5 py-1.5 font-mono tracking-tight tabular">{r.declared}</div>
            <div
              className={cn(
                "truncate px-1.5 py-1.5 font-mono tracking-tight tabular",
                r.state === "bad" && "bg-status-danger-bg text-status-danger",
                r.state === "warn" && "bg-status-warning-bg text-status-warning",
                r.state === "ok" && "bg-card",
              )}
            >
              {r.extracted}
            </div>
            <div className="truncate bg-card px-1.5 py-1.5 font-mono tracking-tight tabular">{r.record}</div>
          </div>
        ))}
      </div>
      <p className="border-t px-2 py-1.5 text-[10px] text-muted-foreground">2 differences flagged for review — not labelled as fraud</p>
    </div>
  );
}

// 3 — Instrument lineage ----------------------------------------------------------------------

function LineageFragment() {
  const gens = [
    { no: "DMB/FD/2023/118204", status: "replaced" as const, year: "Gen 1" },
    { no: "DMB/FD/2024/220913", status: "replaced" as const, year: "Gen 2" },
    { no: "DMB/FD/2025/341177", status: "active" as const, year: "Gen 3" },
  ];
  return (
    <ol className="space-y-1.5">
      {gens.map((g, i) => (
        <li key={g.no} className="relative">
          <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{g.year}</p>
              <p className="truncate font-mono text-[11px]">{g.no}</p>
            </div>
            <StatusBadge status={g.status} noHint className="h-5 text-[10px]" />
          </div>
          {i < gens.length - 1 && <span className="ml-5 block h-1.5 w-px bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

// 4 — Maturity radar (live) -------------------------------------------------------------------

function RadarFragment({ data }: { data: DemoData | null }) {
  const cells = useMemo(() => {
    if (!data) return null;
    const today = todayIST();
    const counts = new Array(91).fill(0) as number[];
    for (const i of data.instruments) {
      if (i.status !== "active" || !i.maturityDate) continue;
      const d = daysBetween(today, i.maturityDate);
      if (d >= 0 && d < 91) counts[d] += 1;
    }
    return counts;
  }, [data]);

  if (!cells) return <Skeleton className="h-full w-full" />;
  const total = cells.reduce((a, b) => a + b, 0);
  const in30 = cells.slice(0, 31).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2">
      <div className="grid h-36 grid-flow-col grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px]" role="img" aria-label={`${total} active instruments mature in the next 90 days`}>
        {cells.map((n, d) => (
          <span
            key={d}
            title={n ? `Day +${d}: ${n} maturing` : `Day +${d}`}
            className={cn(
              "rounded-[3px]",
              n === 0 ? "bg-border/60" : n === 1 ? (d <= 30 ? "bg-status-warning/70" : "bg-primary/50") : d <= 30 ? "bg-status-warning" : "bg-primary",
            )}
          />
        ))}
      </div>
      <p className="flex justify-between text-[10px] text-muted-foreground">
        <span>Today → 90 days</span>
        <span className="tabular">
          {total} maturing · <span className="text-status-warning">{in30} within 30 d</span>
        </span>
      </p>
    </div>
  );
}

// 5 — Clause 6.46 release workflow (live) -----------------------------------------------------

function ChecklistFragment({ data }: { data: DemoData | null }) {
  const items = useMemo(() => {
    if (!data) return null;
    const rr = data.releaseRequests.find((r) => r.ref === "RR-2026-0027") ?? data.releaseRequests[0];
    if (!rr) return [];
    return data.checklistRequirements
      .filter((r) => r.checklist === "clause_6_46")
      .map((req) => ({ req, item: data.checklistItems.find((i) => i.caseId === rr.caseId && i.requirementId === req.id) }));
  }, [data]);

  if (!items) return <Skeleton className="h-full w-full" />;
  const done = items.filter((x) => x.item?.status === "satisfied").length;
  return (
    <div className="space-y-1">
      <p className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
        RR-2026-0027
        <span className="text-muted-foreground tabular">
          {done}/{items.length} items
        </span>
      </p>
      {items.map(({ req, item }) => {
        const ok = item?.status === "satisfied";
        return (
          <p key={req.id} className="flex items-center gap-2 text-[11px]">
            {ok ? (
              <Check className="size-3.5 shrink-0 text-status-success" aria-label="Satisfied" />
            ) : (
              <CircleDashed className="size-3.5 shrink-0 text-status-warning" aria-label="Pending" />
            )}
            <span className={cn("truncate", !ok && "text-muted-foreground")}>{req.label}</span>
          </p>
        );
      })}
    </div>
  );
}

// 6 — Tamper-evident audit chain (live) -------------------------------------------------------

function ChainFragment({ data }: { data: DemoData | null }) {
  const [result, setResult] = useState<{ ok: boolean; n: number; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return <Skeleton className="h-full w-full" />;
  const last = data.audit.slice(-3);

  async function verify() {
    if (!data) return;
    setBusy(true);
    const t0 = performance.now();
    const v = await verifyChain(data.audit);
    setResult({ ok: v.ok, n: data.audit.length, ms: Math.max(1, Math.round(performance.now() - t0)) });
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {last.map((e) => (
          <li key={e.seq} className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1 font-mono text-[10px]">
            <span className="truncate">#{e.seq} {e.action}</span>
            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
              {e.prevHash.slice(0, 5)}
              <ArrowRight className="size-2.5" aria-hidden />
              <span className="text-foreground">{e.hash.slice(0, 5)}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={verify}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2.5 text-[11px] font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          Verify integrity
        </button>
        <span className="text-[11px] tabular" aria-live="polite">
          {result &&
            (result.ok ? (
              <span className="text-status-success">✓ {result.n} events intact · {result.ms} ms</span>
            ) : (
              <span className="text-status-danger">Chain broken</span>
            ))}
        </span>
      </div>
    </div>
  );
}

export function Capabilities() {
  const data = useLiveData();
  const cards = [
    { title: "Evidence-linked extraction", body: "Every extracted field points to the exact region it came from, with its confidence.", node: <ExtractionFragment /> },
    { title: "Discrepancy detection", body: "Declared, extracted and on-record values side by side. Differences become review findings.", node: <DiscrepancyFragment /> },
    { title: "Instrument lineage", body: "A renewal links to the FDR it replaces. Earlier generations are kept, never overwritten.", node: <LineageFragment /> },
    { title: "Maturity radar", body: "Ninety days of upcoming maturities at a glance, with reminders before each one.", node: <RadarFragment data={data} />, live: true },
    { title: "Clause 6.46 release workflow", body: "A separate release checklist with clearances recorded as their own records.", node: <ChecklistFragment data={data} />, live: true },
    { title: "Tamper-evident audit chain", body: "Each event's SHA-256 hash covers the one before it, so any edit breaks the chain.", node: <ChainFragment data={data} />, live: true },
  ];

  return (
    <LandingSection
      id="capabilities"
      eyebrow="Capabilities"
      title="Working depth, not slideware."
      lede="Each card below is a small piece of the real product. The live ones read the same demo data the portals use."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={(i % 3) * 0.05}>
            <Card title={c.title} body={c.body} live={c.live}>
              {c.node}
            </Card>
          </Reveal>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link2 className="size-3.5" aria-hidden />
        All institutions, banks and FDR numbers are fictional.
      </p>
    </LandingSection>
  );
}
