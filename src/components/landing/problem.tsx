import { CalendarX2, FolderOpen, History, MailQuestion } from "lucide-react";
import { LandingSection, Reveal } from "./primitives";

const PAINS = [
  {
    icon: FolderOpen,
    title: "Evidence is scattered",
    body: "Receipts, affidavits and approval letters arrive as attachments and paper. Checking an amount means finding the right PDF first.",
  },
  {
    icon: CalendarX2,
    title: "Maturities slip past",
    body: "An FDR that matures unnoticed leaves a deposit unsecured. Nobody is reminded until someone happens to look.",
  },
  {
    icon: History,
    title: "History breaks at every renewal",
    body: "A renewed FDR replaces the old record instead of linking to it. There is no tamper-evident trail of who changed what, and when.",
  },
  {
    icon: MailQuestion,
    title: "Clearances are chased by hand",
    body: "A release waits on several departments. Their status lives in email threads, so nobody can say what is still pending.",
  },
];

export function Problem() {
  return (
    <LandingSection
      id="problem"
      eyebrow="The problem"
      title="Crores in security deposits, tracked in inboxes and spreadsheets."
      lede="Technical institutions lodge FDRs as security deposits. Keeping each one verified, current and accounted for is slow, manual and easy to get wrong."
    >
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
        {PAINS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.04} className="bg-card p-6">
            <p.icon className="mb-4 size-5 text-muted-foreground" aria-hidden />
            <h3 className="font-semibold tracking-tight">{p.title}</h3>
            <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}
