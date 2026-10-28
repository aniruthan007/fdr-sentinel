import { Check, X } from "lucide-react";
import { LandingSection, Reveal } from "./primitives";

const DOES = [
  "Shows fields read from receipts, with a confidence score (precomputed or simulated in this prototype — no live OCR)",
  "Points to the exact page and region each value came from",
  "Compares declared, extracted and on-record values",
  "Flags differences, shortfalls and date gaps for an officer to review",
];

const NEVER = [
  "Approves, rejects or releases anything",
  "Certifies that a document is authentic",
  "Labels anyone or anything as fraud",
  "Records a clearance, or moves money",
];

export function Guardrails() {
  return (
    <LandingSection
      id="guardrails"
      eyebrow="Guardrails"
      title="AI suggests. Officers decide."
      lede="Extraction is a convenience, never an authority. Every decision names a person, a reason and a reference number."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal className="rounded-xl border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">What the AI does</h3>
          <ul className="space-y-3">
            {DOES.map((t) => (
              <li key={t} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success">
                  <Check className="size-3" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.05} className="rounded-xl border bg-card p-6 shadow-soft">
          <h3 className="mb-4 text-sm font-semibold">What it never does</h3>
          <ul className="space-y-3">
            {NEVER.map((t) => (
              <li key={t} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
                  <X className="size-3" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </LandingSection>
  );
}
