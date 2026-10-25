import { cn } from "@/lib/utils";
import {
  daysBetween,
  formatDate,
  formatRelativeDays,
  formatRelativeTime,
  formatTimestamp,
  todayIST,
} from "@/lib/dates";
import type { ISODate, ISOTimestamp } from "@/types";

type DateTextProps =
  | { date: ISODate | null; at?: never; relative?: boolean; className?: string }
  | { at: ISOTimestamp; date?: never; relative?: boolean; className?: string };

/**
 * Calendar dates render as `12 Nov 2026`; instants render in IST.
 * `relative` adds "in 18 days" / "3 h ago" alongside the absolute value.
 */
export function DateText(props: DateTextProps) {
  const { relative, className } = props;
  if (props.at) {
    const abs = formatTimestamp(props.at);
    return (
      <time dateTime={props.at} title={abs} className={cn("tabular whitespace-nowrap", className)}>
        {relative ? formatRelativeTime(props.at) : abs}
      </time>
    );
  }
  if (!props.date) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const days = daysBetween(todayIST(), props.date);
  return (
    <time dateTime={props.date} className={cn("tabular whitespace-nowrap", className)}>
      {formatDate(props.date)}
      {relative && (
        <span className={cn("ml-1.5 text-xs", days < 0 ? "text-status-danger" : "text-muted-foreground")}>
          {formatRelativeDays(days)}
        </span>
      )}
    </time>
  );
}
