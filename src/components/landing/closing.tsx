import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";
import { Container, Reveal } from "./primitives";

export function FinalCta() {
  return (
    <section className="border-t py-16 sm:py-24">
      <Container>
        <Reveal className="flex flex-col items-start gap-6 rounded-2xl border bg-card p-8 shadow-soft sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">See it work in under a minute.</h2>
            <p className="text-pretty text-muted-foreground">
              Pick a role — institution, processing officer, clearance officer, approver or auditor — and land in a
              populated portal. Switch roles any time; reset whenever you like.
            </p>
          </div>
          <Button asChild size="lg" className="h-10 shrink-0 gap-2 px-5">
            <Link href="/enter">
              Launch demo
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Brand href="/" />
          <p className="text-sm text-muted-foreground">Team MAVERICKS · Team ID SIH1277 · Smart India Hackathon 2026</p>
          <p className="text-xs text-muted-foreground italic">Not following the pack.</p>
        </div>
        <p className="max-w-md text-xs text-pretty text-muted-foreground sm:text-right">
          Prototype for evaluation only. All data is synthetic and the app is not connected to AICTE, any bank or any
          government system. Institutions, banks, people and FDR numbers are fictional. This is a proposal, not an
          official site.
        </p>
      </Container>
    </footer>
  );
}
