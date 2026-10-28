"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEMO_STORAGE_KEY, useDemoStore } from "@/store/demo-store";

function DemoBootstrap() {
  useEffect(() => {
    // Persisted state is loaded after mount so the server render and first client render agree.
    void Promise.resolve(useDemoStore.persist.rehydrate()).then(() => useDemoStore.getState().init());
    // Other tabs of THIS browser share the demo records (not the role), so e.g. an approver's open case can see
    // that an institution changed evidence in another tab. This is local browser state, not a shared server.
    function onStorage(e: StorageEvent) {
      if (e.key !== DEMO_STORAGE_KEY || !e.newValue) return;
      try {
        const next = (JSON.parse(e.newValue) as { state?: { data?: unknown } }).state?.data;
        const { data, status } = useDemoStore.getState();
        if (status !== "ready" || !next || JSON.stringify(next) === JSON.stringify(data)) return;
        useDemoStore.setState({ data: next as typeof data });
      } catch {
        // Ignore malformed or partial writes.
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          <DemoBootstrap />
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
