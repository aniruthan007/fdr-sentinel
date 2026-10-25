import type { ISODate, ISOTimestamp } from "@/types";

export const DISPLAY_TZ = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;

const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in India. Maturity maths always runs on IST days. */
export function todayIST(now: Date = new Date()): ISODate {
  return isoDateFmt.format(now);
}

function toUTCms(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTCms(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / DAY_MS);
}

/** The UTC instant for a wall-clock time in IST on the given date. */
export function atIST(date: ISODate, hours: number, minutes = 0): ISOTimestamp {
  const ms = toUTCms(date) + (hours * 60 + minutes - IST_OFFSET_MINUTES) * 60_000;
  return new Date(ms).toISOString();
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timestampFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** en-IN renders September as "Sept"; the house style is DD MMM YYYY. */
function threeLetterMonth(s: string): string {
  return s.replace("Sept", "Sep");
}

export function formatDate(date: ISODate): string {
  return threeLetterMonth(dateFmt.format(new Date(toUTCms(date))));
}

export function formatTimestamp(ts: ISOTimestamp): string {
  return `${threeLetterMonth(timestampFmt.format(new Date(ts)))} IST`;
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function formatRelativeTime(ts: ISOTimestamp, now: Date = new Date()): string {
  const diffMin = Math.round((new Date(ts).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(diffMin);
  const suffix = diffMin < 0 ? "ago" : "from now";
  if (abs < 1) return "just now";
  if (abs < 60) return `${abs} min ${suffix}`;
  if (abs < 60 * 24) return `${Math.round(abs / 60)} h ${suffix}`;
  return `${Math.round(abs / (60 * 24))} d ${suffix}`;
}
