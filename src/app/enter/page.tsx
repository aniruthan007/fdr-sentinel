"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, ClipboardCheck, Gavel, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { DemoGuide } from "@/components/demo/demo-guide";
import { Skeleton } from "@/components/ui/skeleton";
import { portalFor, ROLE_LABELS } from "@/lib/authz";
import { flaggedInstrumentIds } from "@/lib/selectors";
import { instrumentDisplayStatus } from "@/lib/status";
import { DEMO_USERS, ENTRY_ROLES } from "@/data/people";
import type { DemoData } from "@/data/seed";
import { useDemoStore } from "@/store/demo-store";
import { useToday } from "@/store/hooks";
import type { Role } from "@/types";

const ICONS: Partial<Record<Role, LucideIcon>> = {
  institution_owner: Building2,
  processing_officer: ClipboardCheck,
  clearance_officer: ShieldCheck,
  approver: Gavel,
  auditor: ScrollText,
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** One line per role describing what is waiting for them right now, from live demo data. */
function waitingFor(role: Role, d: DemoData, today: string): string {
  switch (role) {
    case "institution_owner": {
      const mine = d.instruments.filter((i) => i.institutionId === "inst-kit");
      const flagged = flaggedInstrumentIds(d);
      const issues = mine.filter((i) => flagged.has(i.id)).length;
      const maturing = mine.filter((i) => instrumentDisplayStatus(i, today) === "near_maturity").length;
      return `${issues} flagged for review · ${maturing} FDR near maturity`;
    }
    case "processing_officer": {
      const n = d.cases.filter((c) => ["open", "in_review", "awaiting_institution"].includes(c.status)).length;
      return `${plural(n, "case")} in the verification queue`;
    }
    case "clearance_officer":
      return `${plural(d.clearances.filter((c) => c.assignedTo === "u-co" && ["pending", "further_info_required"].includes(c.status)).length, "clearance")} outstanding`;
    case "approver":
      return `${plural(d.cases.filter((c) => c.status === "ready_for_decision").length, "case")} ready for decision`;
    case "auditor":
      return `${d.audit.length} hash-chained audit events`;
    default:
      return "";
  }
}

export default function EnterPage() {
  const router = useRouter();
  const enterAs = useDemoStore((s) => s.enterAs);
  const data = useDemoStore((s) => (s.status === "ready" ? s.data : null));
  const today = useToday();

  const cards = useMemo(
    () =>
      ENTRY_ROLES.map(({ userId, blurb }) => {
        const user = DEMO_USERS.find((u) => u.id === userId)!;
        return { user, blurb, Icon: ICONS[user.role] ?? Building2 };
      }),
    [],
  );

  function enter(userId: string) {
    const session = enterAs(userId);
    if (session) router.push(`/${portalFor(session.role)}`);
  }

  return (
    <main id="main" tabIndex={-1} className="h-full overflow-y-auto outline-none">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-10 space-y-4">
          <Brand />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Choose a role to enter the demo</h1>
            <p className="max-w-2xl text-muted-foreground">
              No sign-up and no password. Each role opens a populated portal. You can switch roles at any time from the
              top bar, and reset the demo data whenever you like.
            </p>
            <p className="text-sm">
              <a href="#demo-guide-section" className="font-medium text-primary underline-offset-2 hover:underline">
                Judges: follow the 4-minute demo guide ↓
              </a>
            </p>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ user, blurb, Icon }, i) => {
            const portal = portalFor(user.role);
            return (
              // CSS entrance: starts at first paint, so it never waits for JavaScript (LCP on slow phones).
              <li
                key={user.id}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <button
                  type="button"
                  onClick={() => enter(user.id)}
                  disabled={!data}
                  className="group flex h-full w-full flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-wait"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {portal === "institution" ? "Institution Portal" : "Official Portal"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">{ROLE_LABELS[user.role]}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.name} · {user.title}
                    </p>
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">{blurb}</p>
                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    {data ? (
                      <span className="text-xs font-medium tabular text-foreground">{waitingFor(user.role, data, today)}</span>
                    ) : (
                      <Skeleton className="h-4 w-40" />
                    )}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <DemoGuide />

        <p className="mt-8 text-xs text-muted-foreground">
          Everything you do is stored only in this browser and recorded in a SHA-256 hash-chained audit log. Institutions,
          banks, people and FDR numbers are fictional. Deposit Docket · Team MAVERICKS · Team ID SIH1277. Not endorsed by or
          connected to AICTE or any bank.
        </p>
      </div>
    </main>
  );
}
