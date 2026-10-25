"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Fades and lifts content once as it scrolls into view. Transforms are dropped under reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function LandingSection({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-16 border-t py-16 sm:py-24", className)}>
      <Container>
        <Reveal className="mb-10 max-w-2xl space-y-3 sm:mb-12">
          <p className="text-xs font-medium tracking-[0.08em] text-primary uppercase">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
          {lede && <p className="text-pretty text-muted-foreground">{lede}</p>}
        </Reveal>
        {children}
      </Container>
    </section>
  );
}
