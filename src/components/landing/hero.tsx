"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LifecycleHero } from "./lifecycle-hero";
import { Container } from "./primitives";

export function Hero() {
  const [restart, setRestart] = useState(0);

  function watch() {
    setRestart((n) => n + 1);
    document.getElementById("lifecycle")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="py-12 sm:py-20 lg:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* Rendered visible from the server HTML: this headline is the LCP element, so it must not wait for JS. */}
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-soft">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Deposit Docket · Security Deposit &amp; FDR Management Portal
          </p>
          <h1 className="text-[2.125rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            Every replacement linked. Every decision backed by current evidence.
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground sm:text-lg">
            Deposit Docket keeps each continuing deposit obligation separate from the FDRs that secure it. A replacement
            FDR is checked for apparent shortfalls and date gaps, needs its own evidence, and reaches an authorised
            decision only on the current state of the case.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-10 gap-2 px-4">
              <Link href="/enter">
                Launch demo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-10 gap-2 px-4" onClick={watch}>
              <PlayCircle className="size-4" />
              Watch the lifecycle
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">No sign-up · Synthetic data · Runs entirely in your browser</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
        >
          <LifecycleHero restartSignal={restart} />
        </motion.div>
      </Container>
    </section>
  );
}
