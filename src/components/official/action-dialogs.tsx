"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CLEARANCE_DEPARTMENT_LABELS } from "@/data/releases";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { formatFieldValue, findingTypeFor } from "@/lib/evidence";
import { useDemoStore } from "@/store/demo-store";
import type {
  ChecklistRequirement,
  ClearanceRecord,
  ClearanceStatus,
  DocumentRecord,
  ExtractionField,
  FindingSeverity,
} from "@/types";
import { ChoiceGroup, Field, FormDialog } from "./form-dialog";

type Trigger = { trigger: React.ReactNode };

// ---------------------------------------------------------------------------------------------
// Processing officer
// ---------------------------------------------------------------------------------------------

export function RaiseFindingDialog({
  caseId,
  preset,
  trigger,
}: Trigger & {
  caseId: string;
  preset?: { field: ExtractionField; label: string; declared: string | null; extracted: string | null; record: string | null };
}) {
  const raiseFinding = useDemoStore((s) => s.raiseFinding);
  const [severity, setSeverity] = useState<FindingSeverity>(preset?.field === "amount" ? "critical" : "warning");
  const [description, setDescription] = useState("");
  const defaultText = preset
    ? `${preset.label} on the document (${formatFieldValue(preset.field, preset.extracted)}) differs from the declared value (${formatFieldValue(preset.field, preset.declared)}).`
    : "";

  return (
    <FormDialog
      trigger={trigger}
      title={preset ? `Flag ${preset.label.toLowerCase()} for review` : "Raise a finding"}
      description="A finding is a review item for the institution and the approver. It is never a fraud allegation."
      submitLabel="Raise finding"
      successMessage="Finding raised"
      onOpenChange={(o) => o && setDescription(defaultText)}
      canSubmit={description.trim().length > 0}
      onSubmit={() =>
        raiseFinding({
          caseId,
          type: preset ? findingTypeFor(preset.field) : "other",
          severity,
          description,
          field: preset?.field ?? null,
          declaredValue: preset?.declared ?? null,
          extractedValue: preset?.extracted ?? null,
          recordValue: preset?.record ?? null,
        })
      }
    >
      <Field label="Severity">
        <ChoiceGroup
          name="severity"
          value={severity}
          onChange={setSeverity}
          columns={2}
          options={[
            { value: "critical", label: "Critical", hint: "Blocks approval until resolved" },
            { value: "warning", label: "Warning", hint: "Needs attention" },
          ]}
        />
      </Field>
      <Field label="What was found" htmlFor="finding-desc">
        <Textarea id="finding-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
    </FormDialog>
  );
}

export function RequestCorrectionDialog({ caseId, openFindings, trigger }: Trigger & { caseId: string; openFindings: number }) {
  const requestCorrection = useDemoStore((s) => s.requestCorrection);
  const [message, setMessage] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title="Request correction from the institution"
      description={`The case moves to “Awaiting institution”${openFindings ? ` and ${openFindings} open finding(s) are sent with it` : ""}. The institution is notified.`}
      submitLabel="Send request"
      successMessage="Correction requested"
      onOpenChange={(o) => o && setMessage("")}
      canSubmit={message.trim().length > 0}
      onSubmit={() => requestCorrection({ caseId, message })}
    >
      <Field label="Message to the institution" htmlFor="corr-msg">
        <Textarea id="corr-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="e.g. Upload a corrected FDR receipt showing the declared amount." />
      </Field>
    </FormDialog>
  );
}

export function ResolveFindingDialog({ findingId, trigger }: Trigger & { findingId: string }) {
  const resolveFinding = useDemoStore((s) => s.resolveFinding);
  const [resolution, setResolution] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title="Resolve finding"
      description="Record how the finding was addressed. The finding stays in the case history."
      submitLabel="Resolve"
      successMessage="Finding resolved"
      onOpenChange={(o) => o && setResolution("")}
      canSubmit={resolution.trim().length > 0}
      onSubmit={() => resolveFinding({ findingId, resolution })}
    >
      <Field label="Resolution" htmlFor="resolution">
        <Textarea id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="e.g. Corrected receipt uploaded; amount now matches the declaration." />
      </Field>
    </FormDialog>
  );
}

/** The document kind that evidences each checklist item. */
const EVIDENCE_KIND: Record<string, DocumentRecord["kind"]> = {
  "A1-01": "fdr_receipt",
  "A1-02": "affidavit",
  "A1-03": "letter_of_approval",
  "A2-01": "fdr_receipt",
  "A2-02": "bank_confirmation",
  "6.46-01": "release_application",
  "6.46-02": "affidavit",
  "6.46-03": "fdr_receipt",
  "6.46-04": "letter_of_approval",
};

export function ChecklistOutcomeDialog({
  itemId,
  requirement,
  documents,
  trigger,
}: Trigger & { itemId: string; requirement: ChecklistRequirement; documents: DocumentRecord[] }) {
  const record = useDemoStore((s) => s.recordChecklistOutcome);
  const [outcome, setOutcome] = useState<"satisfied" | "failed" | "not_applicable">("satisfied");
  const [evidence, setEvidence] = useState<string>("");
  const [note, setNote] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title={`${requirement.code} · ${requirement.label}`}
      description={requirement.sourceClause}
      submitLabel="Record outcome"
      successMessage="Checklist outcome recorded"
      onOpenChange={(o) => {
        if (!o) return;
        setOutcome("satisfied");
        // Suggest the most recent document of the kind this requirement asks for.
        const kind = EVIDENCE_KIND[requirement.code];
        const match = [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).find((d) => d.kind === kind);
        setEvidence(match?.id ?? "");
        setNote("");
      }}
      canSubmit={outcome === "satisfied" || note.trim().length > 0}
      onSubmit={() => record({ itemId, outcome, evidenceDocumentId: outcome === "satisfied" && evidence ? evidence : null, note })}
    >
      <Field label="Outcome">
        <ChoiceGroup
          name="outcome"
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: "satisfied", label: "Satisfied", hint: "Evidence reviewed and acceptable" },
            { value: "failed", label: "Not satisfied", hint: "Missing or unacceptable; reason required" },
            { value: "not_applicable", label: "Not applicable", hint: "Does not apply to this request; reason required" },
          ]}
        />
      </Field>
      {outcome === "satisfied" ? (
        <Field label="Evidence document" htmlFor="evidence" hint="Uploading or extracting a document never satisfies an item by itself.">
          <select
            id="evidence"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="">No document</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {DOCUMENT_KIND_LABELS[d.kind]} — {d.fileName}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Reason" htmlFor="cl-note">
          <Textarea id="cl-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
      )}
    </FormDialog>
  );
}

export function MarkReadyDialog({ caseId, trigger }: Trigger & { caseId: string }) {
  const markReady = useDemoStore((s) => s.markReadyForDecision);
  const [text, setText] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title="Mark ready for authorised decision"
      description="This is a recommendation, not an approval. Only the Approver can record the decision."
      submitLabel="Send to approver"
      successMessage="Case is ready for authorised decision"
      onOpenChange={(o) => o && setText("")}
      canSubmit={text.trim().length > 0}
      onSubmit={() => markReady({ caseId, recommendation: text })}
    >
      <Field label="Recommendation" htmlFor="rec">
        <Textarea id="rec" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="e.g. Recommend approval: all fields match and the checklist is complete." />
      </Field>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Approver
// ---------------------------------------------------------------------------------------------

export function DecisionDialog({ caseId, caseRef, suggestedRef, trigger }: Trigger & { caseId: string; caseRef: string; suggestedRef: string }) {
  const recordDecision = useDemoStore((s) => s.recordDecision);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  return (
    <FormDialog
      trigger={trigger}
      title={`Record decision on ${caseRef}`}
      description="Your decision is recorded with your name, a reason and an order/NOC reference. No funds are moved and no NOC is generated by the system."
      submitLabel="Record decision"
      successMessage={`Decision recorded on ${caseRef}`}
      destructive={decision === "rejected"}
      onOpenChange={(o) => {
        if (!o) return;
        setDecision(null);
        setReason("");
        setRef(suggestedRef);
      }}
      canSubmit={!!decision && reason.trim().length > 0 && ref.trim().length > 0}
      onSubmit={() => recordDecision({ caseId, decision: decision!, reason, referenceNo: ref })}
    >
      <Field label="Decision">
        <ChoiceGroup
          name="decision"
          value={decision}
          onChange={setDecision}
          columns={2}
          options={[
            { value: "approved", label: "Approve" },
            { value: "rejected", label: "Reject" },
          ]}
        />
      </Field>
      <Field label="Reason" htmlFor="dec-reason">
        <Textarea id="dec-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </Field>
      <Field label="Order / NOC reference" htmlFor="dec-ref">
        <Input id="dec-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="font-mono" />
      </Field>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Clearance officer
// ---------------------------------------------------------------------------------------------

type Outcome = Exclude<ClearanceStatus, "pending" | "not_requested">;

export function ClearanceDialog({ clearance, requestRef, trigger }: Trigger & { clearance: ClearanceRecord; requestRef: string }) {
  const recordClearance = useDemoStore((s) => s.recordClearance);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const dept = CLEARANCE_DEPARTMENT_LABELS[clearance.department];
  const options: { value: Outcome; label: string; hint: string }[] = [
    { value: "cleared", label: "Cleared", hint: "Positive outcome; reference required" },
    { value: "further_info_required", label: "Further information required", hint: "Reason required" },
    { value: "not_cleared", label: "Not cleared", hint: "Negative outcome; reason required" },
    { value: "not_applicable", label: "Not applicable", hint: "Reason required" },
    { value: "error_unavailable", label: "Error / unavailable", hint: "Source unavailable; never counts as cleared" },
  ];
  const allowed = clearance.status === "further_info_required" ? options.filter((o) => ["cleared", "not_cleared"].includes(o.value)) : options;

  return (
    <FormDialog
      trigger={trigger}
      title={`${dept} clearance · ${requestRef}`}
      description="Source is SIMULATED in this prototype. Record the outcome the department gave you."
      submitLabel="Record clearance"
      successMessage={`${dept} clearance recorded`}
      onOpenChange={(o) => {
        if (!o) return;
        setOutcome(null);
        setReference("");
        setRemarks("");
      }}
      canSubmit={!!outcome && (outcome === "cleared" ? reference.trim().length > 0 : remarks.trim().length > 0)}
      onSubmit={() => recordClearance({ clearanceId: clearance.id, outcome: outcome!, reference, remarks })}
    >
      <Field label="Outcome">
        <ChoiceGroup name="clr-outcome" value={outcome} onChange={setOutcome} options={allowed} />
      </Field>
      {outcome === "cleared" && (
        <Field label="Clearance reference" htmlFor="clr-ref">
          <Input id="clr-ref" value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" placeholder="e.g. PGRC/CLR/2026/0118" />
        </Field>
      )}
      <Field label={outcome === "cleared" ? "Remarks (optional)" : "Reason"} htmlFor="clr-remarks">
        <Textarea id="clr-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
      </Field>
    </FormDialog>
  );
}
