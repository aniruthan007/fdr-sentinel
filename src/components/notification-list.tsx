"use client";

import Link from "next/link";
import { AlertTriangle, BellOff, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationSeverity } from "@/types";
import { DateText } from "./date-text";
import { EmptyState } from "./empty-state";

const ICON: Record<NotificationSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: OctagonAlert,
  success: CheckCircle2,
};
const TONE: Record<NotificationSeverity, string> = {
  info: "text-status-info",
  warning: "text-status-warning",
  critical: "text-status-danger",
  success: "text-status-success",
};

export function NotificationList({ items }: { items: AppNotification[] }) {
  if (items.length === 0) {
    return <EmptyState icon={BellOff} title="You're all caught up" description="New reminders and decisions will appear here." />;
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-soft">
      {[...items]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => {
          const Icon = ICON[n.severity];
          const body = (
            <div className="flex gap-3 px-4 py-3">
              <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[n.severity])} aria-label={n.severity} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className={cn("text-sm", n.readAt ? "text-foreground" : "font-semibold")}>{n.title}</p>
                  <DateText at={n.createdAt} relative className="text-xs text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </div>
              {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
            </div>
          );
          return (
            <li key={n.id}>
              {n.href ? (
                <Link href={n.href} className="block transition-colors hover:bg-accent/40">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
    </ul>
  );
}
