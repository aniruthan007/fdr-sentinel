"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDemoStore } from "@/store/demo-store";

function DemoBootstrap() {
  useEffect(() => {
    // Persisted state is loaded after mount so the server render and first client render agree.
    void Promise.resolve(useDemoStore.persist.rehydrate()).then(() => useDemoStore.getState().init());
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
