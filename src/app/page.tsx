import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";

/** Temporary. Phase 2 replaces this with the showcase landing page and lifecycle hero. */
export default function Home() {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-4">
      <div className="w-full max-w-lg space-y-6 py-16 text-center">
        <Brand className="justify-center" />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Every security deposit, tracked from receipt to release.
          </h1>
          <p className="text-muted-foreground">
            A prototype portal for institutions and officials to verify FDRs, catch mismatches, never miss a
            maturity, and release deposits with a tamper-evident audit trail.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/enter">
            Enter the demo
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">SIH 2026 · Team Mavericks · All data is synthetic.</p>
      </div>
    </div>
  );
}
