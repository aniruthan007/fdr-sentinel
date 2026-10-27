"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JUDGE_SCENARIO } from "@/data/scenario";
import { useDemoStore } from "@/store/demo-store";

/** Exact steps for the replacement-impact story. Labels match the UI. */
const STEPS: { role: string; text: React.ReactNode }[] = [
  { role: "Institution Owner", text: <>Press <b>Start judge scenario</b>. It resets this browser&apos;s demo data and opens FDR <code>SUB/TD/2025/0123456</code>: ₹25 lakh, maturing in 12 days, securing a ₹25 lakh additional-course obligation. Under <b>Reviews and confirmations</b>, note its own bank confirmation (SIMULATED, ref. <code>SIM-SUB/CNF/2025/0451</code>).</> },
  { role: "Institution Owner", text: <>Click <b>Renew / replace</b> → <b>Fill scenario values</b>. Read the <b>impact preview</b>: apparent shortfall ₹5,00,000, apparent 14-day coverage gap, and the original&apos;s confirmation does not carry over. Click <b>Submit replacement</b>.</> },
  { role: "Processing Officer", text: <>Switch role (top bar) → <b>Verification cases</b> → <b>Replacement of SUB/TD/2025/0123456</b>. The <b>Replacement impact</b> panel shows the findings with reasons and next actions; the successor&apos;s reviews are pending and the original&apos;s stay with the original. <b>Mark ready for decision</b> is refused, with the reasons.</> },
  { role: "Institution Owner", text: <>Switch back → <b>Renewals</b> → open <code>{JUDGE_SCENARIO.successorNo}</code> → <b>Amend replacement</b> → <b>Fill resolution values</b> → <b>Submit amendment</b>. Receipt v2 supersedes v1 (v1 is kept). No shortfall or gap now, but the status reads <i>Insufficient information—review required</i> until the evidence is reviewed. Press <b>Confirm all 7</b> on receipt v2.</> },
  { role: "Processing Officer", text: <>Open the case again → <b>Request bank confirmation (simulated)</b> → <b>Record</b> RE-01 as satisfied with receipt v2 → <b>Mark ready for decision</b> with a recommendation. Ready is not approval.</> },
  { role: "Approver", text: <>Switch → <b>Decisions</b> → open the case → <b>Record decision</b> with a reason and reference. Only now does the original become <i>Replaced</i>, with the effective date recorded on the link.</> },
  { role: "Institution Owner", text: <>Switch back → <b>Notifications</b> shows the decision; the deposit page shows the lineage and both instruments&apos; separate review histories.</> },
];

export function DemoGuide() {
  const router = useRouter();
  const enterAs = useDemoStore((s) => s.enterAs);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const ready = useDemoStore((s) => s.status === "ready");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    enterAs("u-owner");
    const r = await resetDemo();
    setBusy(false);
    if (!r.ok) {
      toast.error("Could not reset the demo", { description: r.error });
      return;
    }
    router.push(`/institution/deposits/${JUDGE_SCENARIO.originalId}`);
  }

  return (
    <section id="demo-guide-section" aria-labelledby="demo-guide" className="mt-10 scroll-mt-4 rounded-xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 id="demo-guide" className="text-lg font-semibold tracking-tight">Demo guide · replacement impact</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            One repeatable story, about 4 minutes: original → replacement draft → impact explanation → pending evidence and
            review → permitted resolution → separate official decision. All records are synthetic; bank and clearance responses
            are SIMULATED.
          </p>
        </div>
        <Button onClick={start} disabled={!ready || busy} className="shrink-0 gap-2">
          <PlayCircle className="size-4" /> {busy ? "Resetting…" : "Start judge scenario"}
        </Button>
      </div>
      <ol className="mt-5 space-y-3">
        {STEPS.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 text-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-foreground">{i + 1}</span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{s.role}</p>
              <p className="text-pretty [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12px]">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t pt-4 text-xs text-pretty text-muted-foreground">
        <b className="text-foreground">Optional stale-decision check:</b> before step 6, open this site in a second tab of the same browser as the
        Institution Owner and upload a new FDR receipt for <code className="font-mono">{JUDGE_SCENARIO.successorNo}</code> under <b>Documents</b>. The
        Approver&apos;s open case shows <i>This case changed after you opened it</i>, and a decision on the old view is rejected; the new receipt
        also sends the case back to review, so repeat steps 4–5 for the new version. Tabs share this browser&apos;s local data — there is no
        shared server. <b className="text-foreground">Restart</b> any time with Start judge scenario or Reset demo.
      </p>
    </section>
  );
}
