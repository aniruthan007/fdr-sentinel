"use client";

import { useMemo } from "react";
import { todayIST } from "@/lib/dates";
import type { DemoData } from "@/data/seed";
import { useDemoStore } from "./demo-store";

export function useDemoReady(): boolean {
  return useDemoStore((s) => s.status === "ready");
}

/** Demo data. Only call beneath <DemoGate>, which guarantees it is loaded. */
export function useDemoData(): DemoData {
  const data = useDemoStore((s) => s.data);
  if (!data) throw new Error("useDemoData called before the demo store was ready");
  return data;
}

export function useSession() {
  return useDemoStore((s) => s.session);
}

export function useToday() {
  return useMemo(() => todayIST(), []);
}
