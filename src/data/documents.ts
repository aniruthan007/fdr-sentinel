import type {
  BoundingBox,
  DocumentExtraction,
  DocumentKind,
  DocumentRecord,
  ExtractionField,
  FinancialInstrument,
  Institution,
} from "@/types";
import type { SeedContext } from "./context";

/**
 * Field positions on the synthetic FDR receipt template (fractions of the page).
 * The generated PDFs (Phase 3) place text at exactly these boxes, so overlays line up.
 */
export const RECEIPT_LAYOUT: Record<ExtractionField, BoundingBox> = {
  bank_name: { x: 0.08, y: 0.07, w: 0.46, h: 0.05 },
  instrument_no: { x: 0.56, y: 0.18, w: 0.36, h: 0.04 },
  beneficiary: { x: 0.08, y: 0.27, w: 0.6, h: 0.04 },
  amount: { x: 0.08, y: 0.36, w: 0.4, h: 0.05 },
  issue_date: { x: 0.08, y: 0.46, w: 0.26, h: 0.04 },
  maturity_date: { x: 0.56, y: 0.46, w: 0.26, h: 0.04 },
  lien_holder: { x: 0.08, y: 0.58, w: 0.7, h: 0.04 },
};

export const EXTRACTION_FIELD_LABELS: Record<ExtractionField, string> = {
  instrument_no: "Instrument no.",
  amount: "Amount",
  issue_date: "Issue date",
  maturity_date: "Maturity date",
  bank_name: "Bank",
  beneficiary: "Beneficiary",
  lien_holder: "Lien holder",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  fdr_receipt: "FDR / instrument receipt",
  affidavit: "Affidavit 6",
  letter_of_approval: "LoA / EoA",
  release_application: "Release request letter",
  bank_confirmation: "Bank lien confirmation",
};

const reviewedStatus = new Set(["verified", "active", "replaced", "release_requested", "released"]);

function receiptFor(inst: FinancialInstrument, ctx: SeedContext, i: number): DocumentRecord {
  const slug = inst.instrumentNo.replace(/[^A-Za-z0-9]+/g, "-");
  return {
    id: `doc-${inst.id}-rcpt`,
    institutionId: inst.institutionId,
    instrumentId: inst.id,
    caseId: null,
    kind: "fdr_receipt",
    fileName: `${slug}.pdf`,
    pages: 1,
    sizeBytes: 182_000 + i * 2_311,
    status: reviewedStatus.has(inst.status) ? "confirmed" : "extracted",
    uploadedBy: inst.institutionId === "inst-kit" ? "u-owner" : `ext-${inst.institutionId}`,
    uploadedAt: inst.submittedAt,
    version: 1,
    supersedesDocumentId: null,
  };
}

type ExtraDoc = [id: string, inst: string, instrumentId: string | null, caseId: string | null, kind: DocumentKind, fileName: string, pages: number, offset: number];

/** Supporting documents. DPIP's affidavit is deliberately absent — that is the missing-document case. */
const SUPPORTING: ExtraDoc[] = [
  ["doc-kit-loa", "inst-kit", null, null, "letter_of_approval", "KIT-LoA-2026-27.pdf", 3, -40],
  ["doc-kit-aff", "inst-kit", "fdr-kit-05", "vc-01", "affidavit", "KIT-Affidavit-intake-2026.pdf", 2, -6],
  ["doc-kit-rel", "inst-kit", "fdr-kit-06", "vc-05", "release_application", "KIT-Release-MTech-SE.pdf", 2, -12],
  ["doc-kit-aff6-rel", "inst-kit", "fdr-kit-06", "vc-05", "affidavit", "KIT-Affidavit-6-release.pdf", 2, -12],
  ["doc-wgce-aff", "inst-wgce", "fdr-wgce-01", "vc-02", "affidavit", "WGCE-Affidavit-2026.pdf", 2, -9],
  ["doc-wgce-loa", "inst-wgce", null, null, "letter_of_approval", "WGCE-LoA-2026-27.pdf", 3, -45],
  ["doc-dpip-loa", "inst-dpip", null, "vc-03", "letter_of_approval", "DPIP-LoA-2026-27.pdf", 3, -4],
  ["doc-hit-aff", "inst-hit", "fdr-hit-03", "vc-04", "affidavit", "HIT-Affidavit-intake.pdf", 2, -1],
  ["doc-ysm-rel", "inst-ysm", "fdr-ysm-01", "vc-06", "release_application", "YSM-Release-PGDM-Evening.pdf", 2, -70],
  ["doc-ysm-aff6", "inst-ysm", "fdr-ysm-01", "vc-06", "affidavit", "YSM-Affidavit-6-release.pdf", 2, -70],
  ["doc-ysm-loa", "inst-ysm", null, "vc-06", "letter_of_approval", "YSM-EoA-2025-26.pdf", 3, -70],
  ["doc-kit-bank", "inst-kit", "fdr-kit-03", "vc-07", "bank_confirmation", "DMB-Lien-Confirmation-341177.pdf", 1, -364],
  ["doc-kit-07-bank", "inst-kit", "fdr-kit-07", null, "bank_confirmation", "SUB-Confirmation-0123456.pdf", 1, -350],
];

export function buildDocuments(ctx: SeedContext, instruments: FinancialInstrument[]): DocumentRecord[] {
  const receipts = instruments.map((inst, i) => receiptFor(inst, ctx, i));
  const caseOf: Record<string, string> = {
    "fdr-kit-05": "vc-01",
    "fdr-wgce-01": "vc-02",
    "fdr-dpip-01": "vc-03",
    "fdr-hit-03": "vc-04",
  };
  for (const r of receipts) r.caseId = r.instrumentId ? (caseOf[r.instrumentId] ?? null) : null;

  const supporting = SUPPORTING.map(
    ([id, institutionId, instrumentId, caseId, kind, fileName, pages, offset], i): DocumentRecord => ({
      id,
      institutionId,
      instrumentId,
      caseId,
      kind,
      fileName,
      pages,
      sizeBytes: 240_000 + i * 17_903,
      status: "confirmed",
      uploadedBy: institutionId === "inst-kit" ? "u-owner" : `ext-${institutionId}`,
      uploadedAt: ctx.t(offset, 16, 10),
      version: 1,
      supersedesDocumentId: null,
    }),
  );
  return [...receipts, ...supporting];
}

/**
 * Precomputed extractions for the receipts that drive demo cases.
 * `overrides` is where a document disagrees with what the institution declared.
 */
const EXTRACTED: Record<string, { confidence: number[]; overrides?: Partial<Record<ExtractionField, (ctx: SeedContext) => string>> }> = {
  "fdr-kit-03": { confidence: [0.99, 0.98, 0.97, 0.99, 0.98, 0.97, 0.95] },
  "fdr-kit-07": { confidence: [0.99, 0.97, 0.98, 0.99, 0.97, 0.98, 0.96] },
  "fdr-kit-05": {
    confidence: [0.98, 0.94, 0.96, 0.91, 0.97, 0.88, 0.93],
    overrides: { amount: () => "2000000.00", maturity_date: (ctx) => ctx.d(329) },
  },
  "fdr-wgce-01": { confidence: [0.99, 0.97, 0.98, 0.96, 0.98, 0.97, 0.94] },
  "fdr-dpip-01": { confidence: [0.97, 0.95, 0.93, 0.94, 0.96, 0.95, 0.9] },
  "fdr-hit-03": { confidence: [0.86, 0.81, 0.9, 0.84, 0.92, 0.89, 0.83] },
};

const FIELD_ORDER: ExtractionField[] = [
  "bank_name",
  "instrument_no",
  "beneficiary",
  "amount",
  "issue_date",
  "maturity_date",
  "lien_holder",
];

export function buildExtractions(
  ctx: SeedContext,
  instruments: FinancialInstrument[],
  institutions: Institution[],
): DocumentExtraction[] {
  const out: DocumentExtraction[] = [];
  for (const inst of instruments) {
    const spec = EXTRACTED[inst.id];
    if (!spec) continue;
    const confirmed = inst.status === "active";
    const declared: Record<ExtractionField, string> = {
      bank_name: inst.bankName,
      instrument_no: inst.instrumentNo,
      beneficiary: institutions.find((x) => x.id === inst.institutionId)!.name,
      amount: (inst.amountPaise / 100).toFixed(2),
      issue_date: inst.issueDate,
      maturity_date: inst.maturityDate ?? "",
      lien_holder: inst.lienHolder,
    };
    FIELD_ORDER.forEach((field, i) => {
      out.push({
        id: `ext-${inst.id}-${field}`,
        documentId: `doc-${inst.id}-rcpt`,
        field,
        value: spec.overrides?.[field]?.(ctx) ?? declared[field],
        confidence: spec.confidence[i],
        page: 1,
        bbox: RECEIPT_LAYOUT[field],
        source: "PRECOMPUTED",
        confirmedBy: confirmed ? "u-po" : null,
        confirmedAt: confirmed ? ctx.t(-360, 12, 30) : null,
      });
    });
  }
  return out;
}
