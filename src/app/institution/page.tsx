"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileCheck2, Landmark, ScanSearch, Send, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateText } from "@/components/date-text";
import { MoneyText } from "@/components/money-text";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ObligationCover } from "@/components/institution/obligation-cover";
import { daysBetween, formatRelativeDays } from "@/lib/dates";
import { correctionMessage, latestCaseFor, renewalInProgress } from "@/lib/institution";
import { isOpenRelease } from "@/lib/selectors";
import { instrumentDisplayStatus, STATUS_META } from "@/lib/status";
import { useDemoData, useSession, useToday } from "@/store/hooks";

interface Attention {
  key: string;
  tone: "danger" | "warning" | "info";
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  href: string;
  cta: string;
}

const TONE = {
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning",
  info: "border-status-info-border bg-status-info-bg text-status-info",
};

export default function InstitutionOverviewPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const instId = session?.institutionId;
  const institution = d.institutions.find((i) => i.id === instId);

  const mine = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const active = mine.filter((i) => i.status === "active");
  const obligations = d.obligations.filter((o) => o.institutionId === instId);
  const openReleases = d.releaseRequests.filter((r) => r.institutionId === instId && isOpenRelease(r));

  const attention = useMemo(() => {
    const items: Attention[] = [];
    for (const c of d.cases.filter((x) => x.institutionId === instId && x.status === "awaiting_institution")) {
      const inst = d.instruments.find((i) => c.instrumentIds.includes(i.id));
      items.push({
        key: c.id,
        tone: "danger",
        icon: Send,
        title: `Correction requested on ${inst?.instrumentNo ?? c.ref}`,
        body: correctionMessage(d, c.id) ?? "An officer asked for a corrected document.",
        href: inst ? `/institution/deposits/${inst.id}` : "/institution/deposits",
        cta: "Respond",
      });
    }
    for (const inst of mine) {
      const c = latestCaseFor(d, inst.id);
      if (c?.status === "in_review" && d.findings.some((f) => f.caseId === c.id && f.status === "open")) {
        items.push({ key: `flag-${inst.id}`, tone: "warning", icon: AlertTriangle, title: `${inst.instrumentNo} is flagged for review`, body: "An officer found differences between what you declared and the receipt. No action is needed until they ask.", href: `/institution/deposits/${inst.id}`, cta: "View" });
      }
    }
    const unconfirmed = d.documents.filter((x) => x.institutionId === instId && x.status === "extracted");
    for (const doc of unconfirmed) {
      const n = d.extractions.filter((e) => e.documentId === doc.id && !e.confirmedAt).length;
      if (n) items.push({ key: `conf-${doc.id}`, tone: "info", icon: ScanSearch, title: `Confirm ${n} extracted field${n > 1 ? "s" : ""}`, body: `${doc.fileName} — check the values read from your receipt.`, href: `/institution/documents?doc=${doc.id}`, cta: "Confirm" });
    }
    for (const inst of active) {
      const st = instrumentDisplayStatus(inst, today);
      if ((st === "near_maturity" || st === "matured") && !renewalInProgress(d, inst.id)) {
        const days = daysBetween(today, inst.maturityDate!);
        items.push({ key: `mat-${inst.id}`, tone: st === "matured" ? "danger" : "warning", icon: CalendarClock, title: `Renew ${inst.instrumentNo}`, body: `Matures ${formatRelativeDays(days)}. Upload the renewed receipt to keep the deposit secured.`, href: "/institution/renewals", cta: "Renew" });
      }
    }
    for (const r of openReleases) {
      items.push({ key: r.id, tone: "info", icon: Undo2, title: `${r.ref} · ${STATUS_META[r.status].label}`, body: `Release of ${r.instrumentIds.length} instrument(s).`, href: `/institution/releases/${r.id}`, cta: "Track" });
    }
    return items;
  }, [d, instId, mine, active, openReleases, today]);

  const activity = d.audit.filter((e) => e.institutionId === instId).slice(-6).reverse();
  const cover = active.reduce((s, i) => s + i.amountPaise, 0);
  const maturing = active.filter((i) => ["near_maturity", "matured"].includes(instrumentDisplayStatus(i, today))).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={institution?.refCode} title={institution?.name ?? "Overview"} description="Your deposits, what needs your attention, and where each request stands." actions={
        <Button asChild size="sm" className="gap-1.5"><Link href="/institution/releases/new"><Undo2 className="size-3.5" /> Request a release</Link></Button>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active deposit cover" value={<MoneyText paise={cover} compact />} hint={`${active.length} active instruments`} icon={Landmark} href="/institution/deposits" />
        <StatCard label="Needs your attention" value={attention.filter((a) => a.tone !== "info").length} hint="Corrections, flags and renewals" icon={AlertTriangle} tone={attention.some((a) => a.tone === "danger") ? "danger" : "default"} />
        <StatCard label="Maturing ≤ 30 days" value={maturing} hint="Renew before maturity" icon={CalendarClock} tone={maturing ? "warning" : "default"} href="/institution/renewals" />
        <StatCard label="Open release requests" value={openReleases.length} hint="Track clearances and decision" icon={Undo2} href="/institution/releases" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
            <CheckCircle2 className="size-4 text-status-success" /> Nothing waiting on you.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
            {attention.map((a) => (
              <li key={a.key} className="flex items-start gap-3 px-4 py-3">
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border", TONE[a.tone])}>
                  <a.icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-sm text-pretty text-muted-foreground">{a.body}</p>
                </div>
                <Button asChild size="sm" variant={a.tone === "danger" ? "default" : "outline"} className="shrink-0 gap-1">
                  <Link href={a.href}>
                    {a.cta} <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Deposit cover by obligation</h2>
          <Link href="/institution/deposits" className="text-xs font-medium text-primary hover:underline">Deposit register</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {obligations.map((o) => (
            <ObligationCover key={o.id} data={d} obligation={o} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <ol className="divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
          {activity.map((e) => (
            <li key={e.seq} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileCheck2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{e.summary}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {e.actorName} · <DateText at={e.at} relative />
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">Every entry is part of the hash-chained audit log (tamper-evident in this browser demo, not tamper-proof).</p>
      </section>

    </div>
  );
}
