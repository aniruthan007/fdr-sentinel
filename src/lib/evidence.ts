import { LIEN_HOLDER } from "@/data/instruments";
import { EXTRACTION_FIELD_LABELS } from "@/data/documents";
import type { DemoData } from "@/data/seed";
import type { DocumentExtraction, ExtractionField, FinancialInstrument } from "@/types";
import { formatDate } from "./dates";
import { formatINR } from "./money";

const FIELDS: ExtractionField[] = ["instrument_no", "amount", "issue_date", "maturity_date", "bank_name", "beneficiary", "lien_holder"];

/** Human display for a raw field value (amounts are rupee strings, dates are ISO). */
export function formatFieldValue(field: ExtractionField, raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (field === "amount") {
    const n = Number(raw);
    return Number.isFinite(n) ? formatINR(Math.round(n * 100)) : raw;
  }
  if ((field === "issue_date" || field === "maturity_date") && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatDate(raw);
  return raw;
}

function same(field: ExtractionField, a: string, b: string): boolean {
  if (field === "amount") return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export interface EvidenceRow {
  field: ExtractionField;
  label: string;
  /** What the institution declared when it submitted the instrument. */
  declared: string | null;
  /** What the document says, suggested by extraction. */
  extraction: DocumentExtraction | null;
  /** What the official register expects (obligation amount, institution name, lien holder). */
  record: string | null;
  /** Declared and extracted values differ. */
  differs: boolean;
  /** Declared value differs from the register. */
  recordDiffers: boolean;
}

/** Declared vs extracted vs on-record, one row per extracted field (CLAUDE.md §5.4). */
export function evidenceRows(d: DemoData, inst: FinancialInstrument): EvidenceRow[] {
  // The latest receipt is compared; earlier ones stay on file as history.
  const receipt = d.documents
    .filter((x) => x.instrumentId === inst.id && x.kind === "fdr_receipt")
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  const extractions = receipt ? d.extractions.filter((e) => e.documentId === receipt.id) : [];
  const institution = d.institutions.find((i) => i.id === inst.institutionId);
  const obligation = d.obligations.find((o) => o.id === inst.obligationId);

  const declared: Record<ExtractionField, string | null> = {
    instrument_no: inst.instrumentNo,
    amount: (inst.amountPaise / 100).toFixed(2),
    issue_date: inst.issueDate,
    maturity_date: inst.maturityDate,
    bank_name: inst.bankName,
    beneficiary: institution?.name ?? null,
    lien_holder: inst.lienHolder,
  };
  const record: Partial<Record<ExtractionField, string>> = {
    amount: obligation ? (obligation.requiredPaise / 100).toFixed(2) : undefined,
    beneficiary: institution?.name,
    lien_holder: LIEN_HOLDER,
  };

  return FIELDS.map((field) => {
    const extraction = extractions.find((e) => e.field === field) ?? null;
    const dec = declared[field];
    const rec = record[field] ?? null;
    return {
      field,
      label: EXTRACTION_FIELD_LABELS[field],
      declared: dec,
      extraction,
      record: rec,
      differs: !!(extraction && dec !== null && !same(field, dec, extraction.value)),
      recordDiffers: !!(rec && dec !== null && !same(field, dec, rec)),
    };
  });
}

/** Finding type implied by a mismatched field. */
export function findingTypeFor(field: ExtractionField) {
  if (field === "amount") return "amount_mismatch" as const;
  if (field === "issue_date" || field === "maturity_date") return "date_mismatch" as const;
  if (field === "instrument_no") return "number_mismatch" as const;
  return "name_mismatch" as const;
}

/** Every audit event that touches a case, its request, instruments, documents, findings or clearances. */
export function caseEntityIds(d: DemoData, caseId: string): Set<string> {
  const c = d.cases.find((x) => x.id === caseId);
  if (!c) return new Set();
  const ids = new Set<string>([c.id, ...c.instrumentIds]);
  if (c.releaseRequestId) ids.add(c.releaseRequestId);
  for (const f of d.findings) if (f.caseId === c.id) ids.add(f.id);
  for (const x of d.clearances) if (x.releaseRequestId === c.releaseRequestId) ids.add(x.id);
  for (const doc of d.documents) {
    if (doc.caseId === c.id || (doc.instrumentId && c.instrumentIds.includes(doc.instrumentId))) {
      ids.add(doc.id);
      for (const e of d.extractions) if (e.documentId === doc.id) ids.add(e.id);
    }
  }
  for (const r of d.renewals) if (c.instrumentIds.includes(r.successorInstrumentId)) ids.add(r.id);
  return ids;
}
