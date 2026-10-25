"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CircleDashed, FileCheck2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DateText } from "@/components/date-text";
import { EmptyState } from "@/components/empty-state";
import { MoneyText } from "@/components/money-text";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { OBLIGATION_KIND_LABELS } from "@/components/tables/columns";
import { FilePicker } from "@/components/institution/file-picker";
import { instrumentDisplayStatus } from "@/lib/status";
import { useCan } from "@/hooks/use-command";
import { useDemoStore, type Attachment } from "@/store/demo-store";
import { useDemoData, useSession, useToday } from "@/store/hooks";

const STEPS = ["Instruments", "Documents", "Review & submit"] as const;

/** Brief §7.3 steps 1–3: pick the instrument(s), attach the Clause 6.46 documents, declare and submit. */
export default function ReleaseWizardPage() {
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const router = useRouter();
  const submit = useDemoStore((s) => s.submitReleaseRequest);
  const instId = session?.institutionId;
  const canSubmit = useCan("submitReleaseRequest", instId);

  const [step, setStep] = useState(0);
  const [obligationId, setObligationId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [letter, setLetter] = useState<Attachment | null>(null);
  const [affidavit, setAffidavit] = useState<Attachment | null>(null);
  const [loa, setLoa] = useState<Attachment | null>(null);
  const [useLoaOnFile, setUseLoaOnFile] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obligations = useMemo(() => d.obligations.filter((o) => o.institutionId === instId), [d, instId]);
  const instruments = useMemo(() => d.instruments.filter((i) => i.institutionId === instId), [d, instId]);
  const loaOnFile = useMemo(
    () => d.documents.filter((x) => x.institutionId === instId && x.kind === "letter_of_approval").sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0],
    [d, instId],
  );
  const chosen = instruments.filter((i) => selected.has(i.id));
  const total = chosen.reduce((s, i) => s + i.amountPaise, 0);
  const receiptsOnFile = chosen.every((i) => d.documents.some((x) => x.instrumentId === i.id && x.kind === "fdr_receipt"));
  const loaReady = (useLoaOnFile && !!loaOnFile) || !!loa;
  const stepValid = [chosen.length > 0, !!letter && !!affidavit && loaReady && reason.trim().length > 0 && receiptsOnFile, declared][step];

  if (!canSubmit) {
    return <EmptyState icon={Lock} title="Only the institution owner can submit a release request" description="Operators can prepare documents in the document centre." />;
  }

  function pickObligation(id: string) {
    setObligationId(id);
    setSelected(new Set(instruments.filter((i) => i.obligationId === id && i.status === "active").map((i) => i.id)));
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const result = await submit({
      instrumentIds: [...selected],
      reason,
      attachments: [letter, affidavit, useLoaOnFile && loaOnFile ? null : loa].filter((a): a is Attachment => !!a),
      existingDocumentIds: useLoaOnFile && loaOnFile ? [loaOnFile.id] : [],
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    toast.success("Release request submitted", { description: "A processing officer will check your documents next." });
    router.push(`/institution/releases/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/institution/releases" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Release requests
      </Link>
      <PageHeader title="Request a deposit release" description="Clause 6.46 lists what a release needs. Clearances are requested by the processing officer after you submit." />

      <ol className="grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={cn("rounded-lg border px-3 py-2 text-xs", i === step ? "border-primary/50 bg-accent font-medium text-accent-foreground" : i < step ? "bg-card text-foreground" : "bg-card text-muted-foreground")}>
            <span className="mr-1.5 font-mono">{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <section className="space-y-5 rounded-xl border bg-card p-4 shadow-soft sm:p-6">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Which deposit do you want released?</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {obligations.map((o) => {
                  const available = instruments.filter((i) => i.obligationId === o.id && i.status === "active").length;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!available}
                      onClick={() => pickObligation(o.id)}
                      className={cn("rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50", obligationId === o.id ? "border-primary/50 bg-accent" : "hover:bg-muted/60")}
                    >
                      <p className="text-sm font-medium">{OBLIGATION_KIND_LABELS[o.kind]}</p>
                      <p className="text-xs text-muted-foreground">
                        <MoneyText paise={o.requiredPaise} compact /> · {available ? `${available} active` : "nothing to release"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            {obligationId && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Instruments</h2>
                <ul className="divide-y rounded-lg border">
                  {instruments
                    .filter((i) => i.obligationId === obligationId && !["replaced", "archived"].includes(i.status))
                    .map((i) => {
                      const ok = i.status === "active";
                      return (
                        <li key={i.id}>
                          <label className={cn("flex items-center gap-3 px-3 py-2.5", ok ? "cursor-pointer" : "opacity-60")}>
                            <input
                              type="checkbox"
                              disabled={!ok}
                              checked={selected.has(i.id)}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(i.id);
                                else next.delete(i.id);
                                setSelected(next);
                              }}
                              className="size-4 accent-[var(--primary)]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[13px]">{i.instrumentNo}</span>
                              <span className="text-xs text-muted-foreground">
                                {i.bankName} · matures <DateText date={i.maturityDate} />
                              </span>
                            </span>
                            <MoneyText paise={i.amountPaise} className="text-sm" />
                            <StatusBadge status={instrumentDisplayStatus(i, today)} className="h-5 text-[11px]" noHint />
                          </label>
                        </li>
                      );
                    })}
                </ul>
                <p className="text-xs text-muted-foreground">Only active instruments can be released.</p>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-sm font-semibold">Why is the deposit no longer needed?</label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Programme discontinued from AY 2026-27 with no students enrolled." />
            </div>
            <div className="space-y-4">
              <DocSlot code="6.46-01" label="Release request letter">
                <FilePicker kind="release_application" value={letter} onChange={setLetter} sampleName="KIT-release-request-letter" />
              </DocSlot>
              <DocSlot code="6.46-02" label="Affidavit 6" hint="Applicant declarations — recorded, not independently verified.">
                <FilePicker kind="affidavit" value={affidavit} onChange={setAffidavit} sampleName="KIT-Affidavit-6-release" />
              </DocSlot>
              <DocSlot code="6.46-03" label="FDR / payment copy">
                <ul className="space-y-1">
                  {chosen.map((i) => {
                    const r = d.documents.find((x) => x.instrumentId === i.id && x.kind === "fdr_receipt");
                    return (
                      <li key={i.id} className={cn("flex items-center gap-2 text-sm", !r && "text-status-danger")}>
                        {r ? <FileCheck2 className="size-4 text-status-success" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                        {r ? <span className="truncate">{r.fileName} · on file</span> : `No receipt on file for ${i.instrumentNo} — upload it in the document centre`}
                      </li>
                    );
                  })}
                </ul>
              </DocSlot>
              <DocSlot code="6.46-04" label="Latest LoA / EoA">
                {loaOnFile && useLoaOnFile ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileCheck2 className="size-4 shrink-0 text-status-success" aria-hidden />
                      <span className="truncate">{loaOnFile.fileName} · on file</span>
                    </span>
                    <button type="button" onClick={() => setUseLoaOnFile(false)} className="shrink-0 text-xs font-medium text-primary hover:underline">Upload a newer one</button>
                  </div>
                ) : (
                  <FilePicker kind="letter_of_approval" value={loa} onChange={setLoa} sampleName="KIT-EoA-2026-27" />
                )}
              </DocSlot>
              <p className="text-xs text-muted-foreground">6.46-05 and 6.46-06 (PGRC, Vigilance and other clearances; Approval Bureau NOC) are requested by the officer after you submit.</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Amount to be released</dt>
                <dd className="mt-0.5"><MoneyText paise={total} /></dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Instruments</dt>
                <dd className="mt-0.5 font-mono text-[13px]">{chosen.map((i) => i.instrumentNo).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Documents</dt>
                <dd className="mt-0.5 text-sm">4 of 4 attached or on file</dd>
              </div>
            </dl>
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm">{reason}</blockquote>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                I confirm the documents are complete and accurate. I understand that submitting does not release any funds; release follows only after clearances and an authorised decision.
              </span>
            </label>
            {error && <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{error}</p>}
          </>
        )}
      </section>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy} className="gap-1.5">
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid} className="gap-1.5">
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={!stepValid || busy} className="gap-1.5">
            <Check className="size-4" /> {busy ? "Submitting…" : "Submit release request"}
          </Button>
        )}
      </div>
    </div>
  );
}

function DocSlot({ code, label, hint, children }: { code: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">{code}</span>
        {label}
      </p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
