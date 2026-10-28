"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceGroup, Field, FormDialog } from "@/components/official/form-dialog";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { addDays, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { useDemoStore, type Attachment } from "@/store/demo-store";
import type { DocumentKind, FinancialInstrument } from "@/types";
import { FilePicker } from "./file-picker";
import { OBLIGATION_KIND_LABELS } from "@/components/tables/columns";
import { ReplacementImpactView } from "@/components/replacement/replacement-impact";
import { JUDGE_SCENARIO, scenarioDraftDates, scenarioResolvedDates } from "@/data/scenario";
import type { DemoData } from "@/data/seed";
import { replacementImpact } from "@/lib/replacement-impact";
import { useDemoData } from "@/store/hooks";

type Trigger = { trigger: React.ReactNode };

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------------------------------------------------------------------------------------
// Upload to the document centre
// ---------------------------------------------------------------------------------------------

const UPLOAD_KINDS: DocumentKind[] = ["fdr_receipt", "affidavit", "letter_of_approval", "bank_confirmation"];

export function UploadDocumentDialog({ institutionId, instruments, trigger }: Trigger & { institutionId: string; instruments: FinancialInstrument[] }) {
  const upload = useDemoStore((s) => s.uploadDocument);
  const [kind, setKind] = useState<DocumentKind>("fdr_receipt");
  const [instrumentId, setInstrumentId] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const inst = instruments.find((i) => i.id === instrumentId);
  const needsInstrument = kind === "fdr_receipt" || kind === "bank_confirmation";

  return (
    <FormDialog
      trigger={trigger}
      title="Upload a document"
      description="FDR receipts get SIMULATED field extraction so you can confirm the values. Extraction only suggests; an officer verifies."
      submitLabel="Upload"
      successMessage="Document uploaded"
      onOpenChange={(o) => {
        if (!o) return;
        setKind("fdr_receipt");
        setInstrumentId(instruments[0]?.id ?? "");
        setFile(null);
      }}
      canSubmit={!!file && (!needsInstrument || !!instrumentId)}
      onSubmit={() => upload({ institutionId, kind, fileName: file!.fileName, sizeBytes: file!.sizeBytes, instrumentId: instrumentId || null })}
    >
      <Field label="Document type" htmlFor="up-kind">
        <select id="up-kind" value={kind} onChange={(e) => { setKind(e.target.value as DocumentKind); setFile(null); }} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          {UPLOAD_KINDS.map((k) => (
            <option key={k} value={k}>{DOCUMENT_KIND_LABELS[k]}</option>
          ))}
        </select>
      </Field>
      <Field label={needsInstrument ? "Instrument" : "Instrument (optional)"} htmlFor="up-inst">
        <select id="up-inst" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          {!needsInstrument && <option value="">Not linked to an instrument</option>}
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>{i.instrumentNo} · {formatINR(i.amountPaise)}</option>
          ))}
        </select>
      </Field>
      <Field label="File">
        <FilePicker kind={kind} value={file} onChange={setFile} sampleName={`${slug(DOCUMENT_KIND_LABELS[kind])}-${slug(inst?.instrumentNo ?? "kit")}`} />
      </Field>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Respond to a correction request
// ---------------------------------------------------------------------------------------------

export function RespondToCorrectionDialog({ caseId, caseRef, instrumentNo, request, trigger }: Trigger & { caseId: string; caseRef: string; instrumentNo: string; request: string | null }) {
  const respond = useDemoStore((s) => s.respondToCorrection);
  const [kind, setKind] = useState<"fdr_receipt" | "affidavit">("fdr_receipt");
  const [file, setFile] = useState<Attachment | null>(null);
  const [message, setMessage] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title={`Respond to ${caseRef}`}
      description={request ? <>The officer asked: <span className="text-foreground">“{request}”</span></> : "Attach the corrected document and add a note for the officer."}
      submitLabel="Send to officer"
      successMessage="Response sent; the case is back with the officer"
      onOpenChange={(o) => {
        if (!o) return;
        setKind("fdr_receipt");
        setFile(null);
        setMessage("");
      }}
      canSubmit={!!file && message.trim().length > 0}
      onSubmit={() => respond({ caseId, message, attachments: [file!] })}
    >
      <Field label="What are you sending?">
        <ChoiceGroup
          name="resp-kind"
          value={kind}
          onChange={(k) => { setKind(k); setFile(null); }}
          columns={2}
          options={[
            { value: "fdr_receipt", label: "Corrected FDR receipt" },
            { value: "affidavit", label: "Affidavit 6" },
          ]}
        />
      </Field>
      <Field label="File">
        <FilePicker kind={kind} value={file} onChange={setFile} sampleName={`${slug(instrumentNo)}-${kind === "fdr_receipt" ? "corrected-receipt" : "affidavit-6"}`} />
      </Field>
      <Field label="Note for the officer" htmlFor="resp-msg">
        <Textarea id="resp-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="e.g. The bank reissued the receipt with the correct amount." />
      </Field>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Replace (renew) an instrument — with a live replacement-impact preview of the draft
// ---------------------------------------------------------------------------------------------

function obligationLabelFor(d: DemoData, obligationId: string): string {
  const ob = d.obligations.find((o) => o.id === obligationId);
  if (!ob) return "—";
  return `${OBLIGATION_KIND_LABELS[ob.kind]} deposit · AY ${ob.academicYear} · ${formatINR(ob.requiredPaise)} required (demo configuration)`;
}

function parsePaise(rupees: string): number {
  return Math.round(Number(rupees.replace(/,/g, "")) * 100);
}

export function RenewDialog({ instrument, trigger }: Trigger & { instrument: FinancialInstrument }) {
  const d = useDemoData();
  const renew = useDemoStore((s) => s.renewInstrument);
  const [no, setNo] = useState("");
  const [rupees, setRupees] = useState("");
  const [issue, setIssue] = useState("");
  const [maturity, setMaturity] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const paise = parsePaise(rupees);
  const valid = no.trim().length > 0 && Number.isFinite(paise) && paise > 0 && !!issue && !!maturity && maturity > issue && !!file;
  const isScenario = instrument.id === JUDGE_SCENARIO.originalId && !!instrument.maturityDate;
  const impact = useMemo(
    () =>
      Number.isFinite(paise) && paise > 0
        ? replacementImpact(d, instrument.id, {
            draft: { instrumentNo: no.trim() || "New instrument", bankName: instrument.bankName, amountPaise: paise, issueDate: issue || null, maturityDate: maturity || null },
            draftHasReceipt: !!file,
          })
        : null,
    [d, instrument, no, paise, issue, maturity, file],
  );

  function fillScenario() {
    const dates = scenarioDraftDates(instrument);
    setNo(JUDGE_SCENARIO.successorNo);
    setRupees(String(JUDGE_SCENARIO.draftAmountRupees));
    setIssue(dates.issueDate);
    setMaturity(dates.maturityDate);
    setFile({ kind: "fdr_receipt", fileName: `${slug(JUDGE_SCENARIO.successorNo)}-receipt.pdf`, sizeBytes: 164_000 });
  }

  return (
    <FormDialog
      wide
      trigger={trigger}
      title={`Replace ${instrument.instrumentNo}`}
      description="The replacement is linked to this instrument and nothing is overwritten. This one stays in force until an authorised decision accepts the replacement. Renewal remains subject to applicable policy and review."
      submitLabel="Submit replacement"
      successMessage="Replacement submitted for review"
      onOpenChange={(o) => {
        if (!o) return;
        const today = todayIST();
        setNo("");
        setRupees(String(instrument.amountPaise / 100));
        setIssue(instrument.maturityDate && instrument.maturityDate > today ? instrument.maturityDate : today);
        setMaturity(addDays(instrument.maturityDate && instrument.maturityDate > today ? instrument.maturityDate : today, 365));
        setFile(null);
      }}
      canSubmit={valid}
      onSubmit={() => renew({ predecessorId: instrument.id, instrumentNo: no, amountPaise: paise, issueDate: issue, maturityDate: maturity, receipt: file ?? undefined })}
    >
      {isScenario && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <span>Judge scenario: a ₹20 lakh replacement deposited 15 days after maturity.</span>
          <Button type="button" size="xs" variant="outline" onClick={fillScenario}>Fill scenario values</Button>
        </div>
      )}
      <Field label="New instrument number" htmlFor="rn-no">
        <Input id="rn-no" value={no} onChange={(e) => setNo(e.target.value)} className="font-mono" placeholder={`e.g. ${instrument.instrumentNo.replace(/\d+$/, "400001")}`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Amount (₹)" htmlFor="rn-amt" hint={Number.isFinite(paise) && paise > 0 ? formatINR(paise) : undefined}>
          <Input id="rn-amt" inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Date of deposit" htmlFor="rn-issue">
          <Input id="rn-issue" type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
        </Field>
        <Field label="Date of maturity" htmlFor="rn-mat">
          <Input id="rn-mat" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </Field>
      </div>
      <Field label="Receipt of the replacement instrument">
        <FilePicker kind="fdr_receipt" value={file} onChange={setFile} sampleName={`${slug(no || "replacement-fdr")}-receipt`} />
      </Field>
      {impact && (
        <section aria-label="Replacement impact preview" className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Replacement draft · impact preview</h3>
          <ReplacementImpactView impact={impact} obligationLabel={obligationLabelFor(d, instrument.obligationId)} compact />
          <p className="text-[11px] text-muted-foreground">You can still submit: an official reviews every finding. Nothing here is a decision.</p>
        </section>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Amend a replacement that has not been decided — creates a new evidence version
// ---------------------------------------------------------------------------------------------

export function AmendReplacementDialog({ successor, trigger }: Trigger & { successor: FinancialInstrument }) {
  const d = useDemoData();
  const amend = useDemoStore((s) => s.amendReplacement);
  const original = d.instruments.find((i) => i.id === successor.predecessorInstrumentId);
  const [rupees, setRupees] = useState("");
  const [issue, setIssue] = useState("");
  const [maturity, setMaturity] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const [note, setNote] = useState("");
  const paise = parsePaise(rupees);
  const isScenario = original?.id === JUDGE_SCENARIO.originalId && !!original.maturityDate;
  const preview = useMemo(() => {
    if (!original || !(paise > 0)) return null;
    // Preview with the amended values; evidence checks apply after the new receipt is submitted.
    return replacementImpact(d, original.id, { draft: { instrumentNo: successor.instrumentNo, bankName: successor.bankName, amountPaise: paise, issueDate: issue || null, maturityDate: maturity || null }, draftHasReceipt: !!file });
  }, [d, original, successor, paise, issue, maturity, file]);
  const valid = Number.isFinite(paise) && paise > 0 && !!issue && !!maturity && maturity > issue && !!file && note.trim().length > 0;

  function fillScenario() {
    if (!original) return;
    const dates = scenarioResolvedDates(original);
    setRupees(String(JUDGE_SCENARIO.resolvedAmountRupees));
    setIssue(dates.issueDate);
    setMaturity(dates.maturityDate);
    setFile({ kind: "fdr_receipt", fileName: `${slug(successor.instrumentNo)}-receipt-revised.pdf`, sizeBytes: 171_000 });
    setNote("Bank reissued the deposit for ₹25,00,000, dated the day after the original matures.");
  }

  return (
    <FormDialog
      wide
      trigger={trigger}
      title={`Amend replacement ${successor.instrumentNo}`}
      description="Amended values need their own receipt. The earlier declaration and receipt stay on record, and the affected reviews start again for the new evidence version."
      submitLabel="Submit amendment"
      successMessage="Amendment submitted; affected reviews reopened"
      onOpenChange={(o) => {
        if (!o) return;
        setRupees(String(successor.amountPaise / 100));
        setIssue(successor.issueDate);
        setMaturity(successor.maturityDate ?? "");
        setFile(null);
        setNote("");
      }}
      canSubmit={valid}
      onSubmit={() => amend({ successorId: successor.id, amountPaise: paise, issueDate: issue, maturityDate: maturity, receipt: file!, note })}
    >
      {isScenario && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <span>Judge scenario: the permitted resolution — ₹25 lakh deposited the day after the original matures.</span>
          <Button type="button" size="xs" variant="outline" onClick={fillScenario}>Fill resolution values</Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Amount (₹)" htmlFor="am-amt" hint={Number.isFinite(paise) && paise > 0 ? formatINR(paise) : undefined}>
          <Input id="am-amt" inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Date of deposit" htmlFor="am-issue">
          <Input id="am-issue" type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
        </Field>
        <Field label="Date of maturity" htmlFor="am-mat">
          <Input id="am-mat" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </Field>
      </div>
      <Field label="Revised receipt (new evidence version)">
        <FilePicker kind="fdr_receipt" value={file} onChange={setFile} sampleName={`${slug(successor.instrumentNo)}-receipt-revised`} />
      </Field>
      <Field label="What changed and why" htmlFor="am-note">
        <Textarea id="am-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Bank reissued the deposit for the full amount." />
      </Field>
      {preview && original && (
        <section aria-label="Amended impact preview" className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Impact preview with amended values</h3>
          <ReplacementImpactView impact={preview} obligationLabel={obligationLabelFor(d, original.obligationId)} compact />
        </section>
      )}
    </FormDialog>
  );
}
