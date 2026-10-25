import { addDays, atIST } from "@/lib/dates";
import type { ISODate, ISOTimestamp } from "@/types";

/**
 * Every seeded date is an offset from "today" (IST), so maturities always look current
 * no matter when the demo is opened.
 */
export interface SeedContext {
  today: ISODate;
  /** Calendar date `offset` days from today. */
  d: (offset: number) => ISODate;
  /** IST wall-clock time on the day `offset` days from today, as a UTC timestamp. */
  t: (offset: number, hours?: number, minutes?: number) => ISOTimestamp;
}

export function seedContext(today: ISODate): SeedContext {
  return {
    today,
    d: (offset) => addDays(today, offset),
    t: (offset, hours = 11, minutes = 0) => atIST(addDays(today, offset), hours, minutes),
  };
}
