import type { Paise } from "@/types";

const inrFull = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Rupees → integer paise. Only for authoring seed data; never feed it floats from arithmetic. */
export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/**
 * Formats paise with Indian digit grouping (₹1,25,00,000.00).
 * Integer paise are split into rupees and paise first, so no float rounding leaks into display.
 */
export function formatINR(paise: Paise, opts: { whole?: boolean } = {}): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupeePart = Math.trunc(abs / 100);
  const paisePart = abs % 100;
  if (opts.whole && paisePart === 0) {
    return (negative ? "-" : "") + inrWhole.format(rupeePart);
  }
  const whole = inrFull.format(rupeePart).replace(/\.00$/, "");
  return `${negative ? "-" : ""}${whole}.${String(paisePart).padStart(2, "0")}`;
}

/** Compact Indian units: ₹1.25 Cr, ₹48.5 L. For tiles and charts, never for records. */
export function formatINRCompact(paise: Paise): string {
  const r = paise / 100;
  if (Math.abs(r) >= 1e7) return `₹${trimZeros((r / 1e7).toFixed(2))} Cr`;
  if (Math.abs(r) >= 1e5) return `₹${trimZeros((r / 1e5).toFixed(2))} L`;
  return formatINR(paise, { whole: true });
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, "");
}

export function sumPaise(values: Paise[]): Paise {
  return values.reduce((a, b) => a + b, 0);
}
