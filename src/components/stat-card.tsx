import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-muted-foreground",
  warning: "text-status-warning",
  danger: "text-status-danger",
  success: "text-status-success",
};

export function StatCard({ label, value, hint, icon: Icon, href, tone = "default" }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft transition-colors",
        href && "hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn("size-4", TONE[tone])} aria-hidden />}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
