import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Info,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type AnyStatus, type StatusTone } from "@/lib/status";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-status-neutral-bg text-status-neutral border-status-neutral-border",
  info: "bg-status-info-bg text-status-info border-status-info-border",
  primary: "bg-status-primary-bg text-status-primary border-status-primary-border",
  success: "bg-status-success-bg text-status-success border-status-success-border",
  warning: "bg-status-warning-bg text-status-warning border-status-warning-border",
  danger: "bg-status-danger-bg text-status-danger border-status-danger-border",
};

/** Each tone also has its own shape, so status never depends on colour alone. */
const TONE_ICON: Record<StatusTone, LucideIcon> = {
  neutral: CircleDashed,
  info: Info,
  primary: CircleDot,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

interface StatusBadgeProps {
  status: AnyStatus;
  /** Override the label (e.g. "Near maturity · 18 d"). The tone still comes from `status`. */
  label?: string;
  className?: string;
  /** Hide the hover hint, e.g. inside a dense table cell that has its own tooltip. */
  noHint?: boolean;
}

export function StatusBadge({ status, label, className, noHint }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = TONE_ICON[meta.tone];
  const badge = (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap transition-colors",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label ?? meta.label}
    </span>
  );
  if (noHint) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{meta.hint}</TooltipContent>
    </Tooltip>
  );
}
