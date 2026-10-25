import { cn } from "@/lib/utils";
import { formatINR, formatINRCompact } from "@/lib/money";
import type { Paise } from "@/types";

interface MoneyTextProps {
  paise: Paise;
  /** ₹1.25 Cr instead of ₹1,25,00,000.00. The exact value stays available on hover. */
  compact?: boolean;
  className?: string;
}

/** Rupee amount in Geist Mono with Indian digit grouping and tabular figures. */
export function MoneyText({ paise, compact, className }: MoneyTextProps) {
  const exact = formatINR(paise);
  return (
    <span
      className={cn("font-mono tabular whitespace-nowrap", className)}
      title={compact ? exact : undefined}
      data-paise={paise}
    >
      {compact ? formatINRCompact(paise) : exact}
    </span>
  );
}
