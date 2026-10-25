import { Architecture } from "@/components/landing/architecture";
import { Capabilities } from "@/components/landing/capabilities";
import { FinalCta, SiteFooter } from "@/components/landing/closing";
import { Guardrails } from "@/components/landing/guardrails";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveStats } from "@/components/landing/live-stats";
import { Problem } from "@/components/landing/problem";
import { SiteNav } from "@/components/landing/site-nav";

/** Showcase landing page: the judge's first ten seconds (CLAUDE.md §1, §5). */
export default function Home() {
  return (
    <div className="h-full overflow-y-auto motion-safe:scroll-smooth">
      <SiteNav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Problem />
        <HowItWorks />
        <Capabilities />
        <Guardrails />
        <Architecture />
        <LiveStats />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
