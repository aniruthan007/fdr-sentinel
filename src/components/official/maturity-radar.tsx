"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarX2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, daysBetween, formatDate } from "@/lib/dates";
import { formatINRCompact } from "@/lib/money";
import { DataTable } from "@/components/data-table";
import { instrumentColumns } from "@/components/tables/columns";
import type { DemoData } from "@/data/seed";
import type { FinancialInstrument, ISODate } from "@/types";

const WINDOW = 90;
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayMon0(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Signature moment 6: 90 days of Active maturities as a calendar heatmap; click a day to drill in. */
export function MaturityRadar({ data, today }: { data: DemoData; today: ISODate }) {
  const router = useRouter();
  const byDate = useMemo(() => {
    const m = new Map<ISODate, FinancialInstrument[]>();
    for (const i of data.instruments) {
      if (i.status !== "active" || !i.maturityDate) continue;
      m.set(i.maturityDate, [...(m.get(i.maturityDate) ?? []), i]);
    }
    return m;
  }, [data]);

  const firstWithMaturity = useMemo(() => {
    for (let n = 0; n <= WINDOW; n++) {
      const day = addDays(today, n);
      if (byDate.has(day)) return day;
    }
    return today;
  }, [byDate, today]);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const active = selected ?? firstWithMaturity;

  // Columns are weeks starting Monday; the grid covers today … today + 90.
  const start = addDays(today, -weekdayMon0(today));
  const weeks = Math.ceil((daysBetween(start, addDays(today, WINDOW)) + 1) / 7);
  const overdue = data.instruments.filter((i) => i.status === "active" && i.maturityDate && i.maturityDate < today);
  const columns = useMemo(() => instrumentColumns(data, today, { institution: true }), [data, today]);
  const dayList = byDate.get(active) ?? [];

  const bands = [
    { label: "0–30 days", lo: 0, hi: 30 },
    { label: "31–60 days", lo: 31, hi: 60 },
    { label: "61–90 days", lo: 61, hi: 90 },
  ].map((b) => {
    const list = data.instruments.filter((i) => {
      if (i.status !== "active" || !i.maturityDate) return false;
      const n = daysBetween(today, i.maturityDate);
      return n >= b.lo && n <= b.hi;
    });
    return { ...b, count: list.length, paise: list.reduce((s, i) => s + i.amountPaise, 0) };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={cn("rounded-lg border p-4 shadow-soft", overdue.length ? "border-status-danger-border bg-status-danger-bg" : "bg-card")}>
          <p className="flex items-center gap-1.5 text-xs font-medium text-status-danger">
            <CalendarX2 className="size-3.5" aria-hidden /> Matured, not renewed
          </p>
          <p className="mt-1 text-2xl font-semibold tabular">{overdue.length}</p>
          <p className="text-xs text-muted-foreground">{overdue.length ? formatINRCompact(overdue.reduce((s, i) => s + i.amountPaise, 0)) + " unsecured" : "None"}</p>
        </div>
        {bands.map((b, i) => (
          <div key={b.label} className="rounded-lg border bg-card p-4 shadow-soft">
            <p className={cn("flex items-center gap-1.5 text-xs font-medium", i === 0 ? "text-status-warning" : "text-muted-foreground")}>
              <CalendarClock className="size-3.5" aria-hidden /> {b.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular">{b.count}</p>
            <p className="text-xs text-muted-foreground">{formatINRCompact(b.paise)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-soft sm:p-5" aria-label="Maturity calendar">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Next 90 days</h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-status-warning" /> ≤ 30 days</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-primary" /> 31–90 days</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] border-2 border-foreground/70" /> Today</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `2rem repeat(${weeks}, minmax(1.75rem, 2.5rem))` }}>
            {/* Month labels */}
            <span />
            {Array.from({ length: weeks }, (_, w) => {
              const day = addDays(start, w * 7);
              const prev = w === 0 ? null : addDays(start, (w - 1) * 7);
              const label = !prev || prev.slice(5, 7) !== day.slice(5, 7) ? MONTHS[Number(day.slice(5, 7)) - 1] : "";
              return (
                <span key={w} className="text-[10px] text-muted-foreground">
                  {label}
                </span>
              );
            })}
            {WEEKDAYS.map((wd, row) => (
              <div key={row} className="contents">
                <span className="flex items-center text-[10px] text-muted-foreground">{wd}</span>
                {Array.from({ length: weeks }, (_, w) => {
                  const day = addDays(start, w * 7 + row);
                  const n = daysBetween(today, day);
                  const inWindow = n >= 0 && n <= WINDOW;
                  const list = byDate.get(day) ?? [];
                  const count = inWindow ? list.length : 0;
                  const isToday = n === 0;
                  const isSel = day === active;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!inWindow}
                      onClick={() => setSelected(day)}
                      aria-pressed={isSel}
                      aria-label={`${formatDate(day)}: ${count} maturing`}
                      title={inWindow ? `${formatDate(day)} · ${count} maturing` : undefined}
                      className={cn(
                        "relative aspect-square min-h-7 rounded-[4px] text-[10px] font-medium tabular transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        !inWindow && "invisible",
                        count === 0 && "bg-muted text-transparent hover:bg-muted-foreground/20",
                        count > 0 && n <= 30 && (count > 1 ? "bg-status-warning text-white" : "bg-status-warning/60 text-foreground"),
                        count > 0 && n > 30 && (count > 1 ? "bg-primary text-primary-foreground" : "bg-primary/45 text-foreground"),
                        isToday && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-card",
                        isSel && "scale-110 shadow-md ring-2 ring-primary ring-offset-1 ring-offset-card",
                      )}
                    >
                      {count > 0 ? count : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Maturing on {formatDate(active)}
          <span className="ml-2 font-normal text-muted-foreground">
            {daysBetween(today, active) === 0 ? "today" : `in ${daysBetween(today, active)} days`} · {dayList.length} instrument{dayList.length === 1 ? "" : "s"}
          </span>
        </h2>
        <DataTable
          columns={columns}
          data={dayList}
          emptyTitle="Nothing matures on this day"
          emptyDescription="Pick a coloured day on the calendar."
          onRowClick={(i) => {
            const c = data.cases.find((x) => x.instrumentIds.includes(i.id));
            if (c) router.push(c.type === "release" && c.releaseRequestId ? `/official/releases/${c.releaseRequestId}` : `/official/cases/${c.id}`);
          }}
        />
      </section>

      {overdue.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-status-danger">Matured without a recorded renewal</h2>
          <DataTable columns={columns} data={overdue} />
        </section>
      )}
    </div>
  );
}
