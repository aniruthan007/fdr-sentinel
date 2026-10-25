"use client";

import { motion } from "motion/react";
import { CalendarClock, ChevronRight, FileUp, Gavel, ScanSearch, ShieldCheck } from "lucide-react";
import { LandingSection } from "./primitives";

const STEPS = [
  { icon: FileUp, title: "Submit", body: "The institution registers the obligation, then uploads the FDR receipt and supporting documents." },
  { icon: ScanSearch, title: "Extract & compare", body: "Fields are extracted with confidence and compared: declared vs document vs on record." },
  { icon: ShieldCheck, title: "Verify", body: "An officer reviews the evidence, raises findings, and requests corrections where needed." },
  { icon: CalendarClock, title: "Monitor maturity", body: "Reminders go out ahead of maturity. Each renewal is linked to the FDR it replaces." },
  { icon: Gavel, title: "Clearance-backed release", body: "The Clause 6.46 checklist and every clearance are recorded before the Approver decides." },
];

export function HowItWorks() {
  return (
    <LandingSection
      id="how-it-works"
      eyebrow="How it works"
      title="One record per FDR, from first upload to final decision."
      lede="Five stages, each an explicit state change that is permission-checked and audited."
    >
      <ol className="grid gap-3 lg:grid-cols-5 lg:gap-4">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-64px" }}
            transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.07 }}
            // Each animated card is its own stacking context; earlier cards sit above so their connector shows.
            style={{ zIndex: STEPS.length - i }}
            className="relative flex gap-4 rounded-xl border bg-card p-5 shadow-soft lg:flex-col lg:gap-5"
          >
            <div className="flex shrink-0 items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-4" aria-hidden />
              </span>
              <span className="hidden font-mono text-xs text-muted-foreground lg:inline">0{i + 1}</span>
            </div>
            <div>
              <h3 className="font-semibold tracking-tight">
                <span className="mr-1.5 font-mono text-xs font-normal text-muted-foreground lg:hidden">0{i + 1}</span>
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{s.body}</p>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="absolute top-1/2 -right-3.5 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground lg:flex"
                aria-hidden
              >
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </LandingSection>
  );
}
