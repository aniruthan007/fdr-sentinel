"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceGroup, Field, FormDialog } from "@/components/official/form-dialog";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { addDays, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { useDemoStore, type Attachment } from "@/store/demo-store";
import type { DocumentKind, FinancialInstrument } from "@/types";
import { FilePicker } from "./file-picker";

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
// Renew an instrument
// ---------------------------------------------------------------------------------------------

export function RenewDialog({ instrument, trigger }: Trigger & { instrument: FinancialInstrument }) {
  const renew = useDemoStore((s) => s.renewInstrument);
  const [no, setNo] = useState("");
  const [rupees, setRupees] = useState("");
  const [issue, setIssue] = useState("");
  const [maturity, setMaturity] = useState("");
  const [file, setFile] = useState<Attachment | null>(null);
  const paise = Math.round(Number(rupees.replace(/,/g, "")) * 100);
  const valid = no.trim().length > 0 && Number.isFinite(paise) && paise > 0 && !!issue && !!maturity && !!file;

  return (
    <FormDialog
      trigger={trigger}
      title={`Renew ${instrument.instrumentNo}`}
      description="The renewed FDR is linked to this one; nothing is overwritten. It becomes active after an officer verifies it and the Approver decides."
      submitLabel="Submit renewal"
      successMessage="Renewal submitted for verification"
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
      <Field label="New FDR number" htmlFor="rn-no">
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
      <Field label="Receipt of the renewed FDR">
        <FilePicker kind="fdr_receipt" value={file} onChange={setFile} sampleName={`${slug(no || "renewed-fdr")}-receipt`} />
      </Field>
    </FormDialog>
  );
}
