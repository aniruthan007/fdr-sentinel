"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check, FileText, GitBranch, Link2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { sealChain } from "@/lib/audit-chain";
import type { AnyStatus } from "@/lib/status";
import type { AuditDraft, AuditEvent } from "@/types";
import { StatusBadge } from "@/components/status-badge";

interface Step {
  label: string;
  /** Status vocabulary the badge borrows its tone from; `label` overrides the text. */
  status: AnyStatus;
  badge: string;
  actor: string;
  action: string;
  summary: string;
}

/** CLAUDE.md §5.1 — the ten lifecycle moments, in order. */
const STEPS: Step[] = [
  { label: "Submitted", status: "submitted", badge: "Submitted", actor: "Institution", action: "instrument.submitted", summary: "FDR receipt uploaded" },
  { label: "Extracted", status: "extracted", badge: "Fields extracted", actor: "System", action: "extraction.completed", summary: "7 fields suggested with confidence" },
  { label: "Mismatch flagged", status: "needs_correction", badge: "Flagged for review", actor: "Processing officer", action: "finding.raised", summary: "Declared amount ≠ receipt" },
  { label: "Corrected", status: "under_review", badge: "Corrected · under review", actor: "Institution", action: "correction.submitted", summary: "Corrected receipt uploaded" },
  { label: "Verified", status: "active", badge: "Verified · Active", actor: "Approver", action: "instrument.verified", summary: "Decision recorded with reference" },
  { label: "Near maturity", status: "near_maturity", badge: "Near maturity", actor: "System", action: "maturity.reminder", summary: "Matures in 18 days — reminder sent" },
  { label: "Replacement", status: "active", badge: "Replacement accepted · linked", actor: "Approver", action: "instrument.renewed", summary: "Impact checked; successor's own evidence confirmed" },
  { label: "Release requested", status: "release_requested", badge: "Release requested", actor: "Institution", action: "release.submitted", summary: "Clause 6.46 checklist attached" },
  { label: "Clearances", status: "awaiting_clearances", badge: "Clearances, then NOC", actor: "Clearance officer", action: "clearance.recorded", summary: "PGRC, Vigilance, other applicable cells, then AB NOC (simulated)" },
  { label: "Decision", status: "approved", badge: "Decision recorded", actor: "Approver", action: "decision.recorded", summary: "Approved · ref DC/REL/2026/0027" },
];

const STEP_MS = 2200;
const FINAL_HOLD_MS = 4200;

/** Fixed, illustrative timestamps so the hashes are deterministic. */
const DRAFTS: AuditDraft[] = STEPS.map((s, i) => ({
  at: new Date(Date.UTC(2026, 0, 5 + i * 3, 5, 30)).toISOString(),
  actorId: s.actor,
  actorName: s.actor,
  actorRole: "system",
  action: s.action,
  entityType: "instrument",
  entityId: "DMB/FD/2025/341177",
  institutionId: "inst-kit",
  summary: s.summary,
  payload: {},
}));

const short = (h: string | undefined) => (h ? `${h.slice(0, 6)}…` : "······");

export function LifecycleHero({ restartSignal = 0 }: { restartSignal?: number }) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const [step, setStep] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [chain, setChain] = useState<AuditEvent[]>([]);
  // The reduced-motion preference is unknown on the server, so text that depends on it waits for mount (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Real SHA-256 chain via Web Crypto — the same code the demo store uses.
  useEffect(() => {
    let alive = true;
    void sealChain(DRAFTS).then((c) => alive && setChain(c));
    return () => {
      alive = false;
    };
  }, []);

  // "Watch the lifecycle" restarts from the first step.
  useEffect(() => {
    if (restartSignal === 0) return;
    setStep(0);
    setManualPause(false);
  }, [restartSignal]);

  const paused = hovered || focused || manualPause || !inView || !!reduce;

  useEffect(() => {
    if (paused) return;
    const last = step === STEPS.length - 1;
    const t = setTimeout(() => setStep(last ? 0 : step + 1), last ? FINAL_HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [step, paused]);

  const go = useCallback((i: number) => {
    setStep(i);
    setManualPause(true);
  }, []);

  const current = STEPS[step];
  const stamped = chain.slice(0, step + 1);

  return (
    <div
      ref={rootRef}
      id="lifecycle"
      // Pause for a real mouse hover or keyboard focus only. Touch emits sticky mouse events, and a tapped
      // button keeps focus, so either would freeze the loop on phones.
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocusCapture={(e) => (e.target as HTMLElement).matches?.(":focus-visible") && setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      className="scroll-mt-24"
      aria-label="Animated lifecycle of one FDR"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        {/* FDR card */}
        <div className="flex flex-col rounded-xl border bg-card shadow-soft">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Fixed deposit receipt</p>
              <p className="truncate font-mono text-sm">DMB/FD/2025/341177</p>
            </div>
            <div className="relative h-6 shrink-0">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <StatusBadge status={current.status} label={current.badge} noHint />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Institution</dt>
              <dd className="truncate">Kaveri Institute of Technology</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Bank</dt>
              <dd className="truncate">Deccan Mercantile Bank</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Amount</dt>
              <dd className="font-mono tabular">₹50,00,000.00</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lien holder</dt>
              <dd className="truncate">Member Secretary</dd>
            </div>
          </dl>

          <div className="min-h-[5.5rem] border-t bg-muted/40 px-4 py-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <StepDetail step={step} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress: one segment per lifecycle step; click to jump. The bar gets the full card width so
              every step target is at least 24px wide and tall (WCAG 2.2 target size). */}
          <div className="space-y-1 border-t px-3 pt-2 pb-1.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setManualPause((p) => !p)}
                className="-ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={paused ? "Play lifecycle" : "Pause lifecycle"}
              >
                {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
              <span className="truncate text-xs text-muted-foreground tabular">
                {step + 1}/10 · {current.label}
              </span>
            </div>
            <ol className="flex gap-0.5">
              {STEPS.map((s, i) => (
                <li key={s.label} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Step ${i + 1}: ${s.label}`}
                    aria-current={i === step ? "step" : undefined}
                    title={s.label}
                    className="group block min-h-6 w-full px-0.5 py-2.5"
                  >
                    <span
                      className={cn(
                        "block h-1 rounded-full transition-colors duration-200",
                        i < step ? "bg-primary/60" : i === step ? "bg-primary" : "bg-border group-hover:bg-muted-foreground/40",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Audit chain */}
        <div className="flex flex-col rounded-xl border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <Link2 className="size-3.5 text-primary" aria-hidden />
              Audit chain
            </p>
            <span className="font-mono text-[10px] text-muted-foreground">SHA-256</span>
          </div>
          {/* The card sets the row height; the chain fills it and clips, so the hero never reflows. */}
          <div className="relative h-44 sm:h-auto sm:min-h-0 sm:flex-1">
          <ol className="absolute inset-0 flex flex-col gap-1.5 overflow-hidden p-2 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]" aria-live="polite">
            <AnimatePresence initial={false}>
              {[...stamped].reverse().map((e, i) => (
                <motion.li
                  key={e.seq}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5",
                    i === 0 ? "border-primary/30 bg-accent/60" : "bg-background",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] font-medium">{e.action}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular">#{String(e.seq).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    <span title={e.prevHash}>{short(e.prevHash)}</span>
                    <ArrowRight className="size-2.5 shrink-0" aria-hidden />
                    <span className="text-foreground" title={e.hash}>
                      {short(e.hash)}
                    </span>
                  </p>
                </motion.li>
              ))}
            </AnimatePresence>
            {chain.length === 0 && <li className="px-1 py-2 text-xs text-muted-foreground">Sealing chain…</li>}
          </ol>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
        Each step stamps an event whose hash covers the one before it. {mounted && reduce ? "Use the steps to move through the lifecycle." : "Hover, or tap a step, to pause."}
      </p>
    </div>
  );
}

function Field({ label, value, tone, conf }: { label: string; value: string; tone?: "bad" | "good"; conf?: string }) {
  return (
    <div className={cn("rounded-md border bg-card px-2 py-1", tone === "bad" && "border-status-danger-border bg-status-danger-bg", tone === "good" && "border-status-success-border bg-status-success-bg")}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-mono text-xs tabular">
        {value}
        {conf && <span className="ml-1.5 text-[10px] text-muted-foreground">{conf}</span>}
      </p>
    </div>
  );
}

function StepDetail({ step }: { step: number }) {
  const line = "flex items-center gap-2 text-xs text-muted-foreground";
  switch (step) {
    case 0:
      return (
        <div className="space-y-1.5">
          <p className={line}><FileText className="size-3.5" /> DMB-FD-2025-341177.pdf · 1 page · 182 KB</p>
          <p className="text-xs text-muted-foreground">Uploaded by the institution. Upload status is separate from verification.</p>
        </div>
      );
    case 1:
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Amount (extracted)" value="₹45,00,000.00" conf="94%" />
          <Field label="Instrument no." value="…/341177" conf="98%" />
        </div>
      );
    case 2:
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Declared" value="₹50,00,000.00" />
          <Field label="On receipt" value="₹45,00,000.00" tone="bad" />
        </div>
      );
    case 3:
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Declared" value="₹50,00,000.00" />
          <Field label="Corrected receipt" value="₹50,00,000.00" tone="good" />
        </div>
      );
    case 4:
      return (
        <div className="space-y-1.5">
          <p className={line}><Check className="size-3.5 text-status-success" /> Verified by an authorised decision, not by OCR</p>
          <p className="font-mono text-[11px] text-muted-foreground">Ref DC/VER/2026/0141 · Dr. V. Rao</p>
        </div>
      );
    case 5:
      return (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-[94%] rounded-full bg-status-warning" />
          </div>
          <p className="text-xs text-muted-foreground">18 days to maturity · reminder sent at 30 days (SIMULATED)</p>
        </div>
      );
    case 6:
      return (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="rounded border bg-card px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">…/118204</span>
          <GitBranch className="size-3 text-muted-foreground" />
          <span className="rounded border bg-card px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">…/220913</span>
          <GitBranch className="size-3 text-muted-foreground" />
          <span className="rounded border bg-card px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">…/341177</span>
          <GitBranch className="size-3 text-muted-foreground" />
          <span className="rounded border border-status-success-border bg-status-success-bg px-1.5 py-0.5">…/400001</span>
        </div>
      );
    case 7:
      return (
        <div className="space-y-1.5">
          <p className="font-mono text-[11px]">RR-2026-0027 · Clause 6.46</p>
          <p className="text-xs text-muted-foreground">Request letter · Affidavit 6 · FDR copy · LoA/EoA attached</p>
        </div>
      );
    case 8:
      return (
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {["PGRC", "Vigilance Cell", "Other applicable cells", "Approval Bureau NOC (after clearances)"].map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-status-success" aria-hidden />
              <span className="truncate">{c}</span>
            </span>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <p className={line}><Check className="size-3.5 text-status-success" /> Approved by the Approver, with reason and reference</p>
          <p className="text-xs text-muted-foreground">Decision recorded. No funds are moved and no NOC is generated by the system.</p>
        </div>
      );
  }
}
