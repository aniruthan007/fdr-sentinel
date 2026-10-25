"use client";

import { cn } from "@/lib/utils";
import { DOCUMENT_KIND_LABELS, EXTRACTION_FIELD_LABELS, RECEIPT_LAYOUT } from "@/data/documents";
import type { DocumentExtraction, DocumentRecord, ExtractionField, FinancialInstrument } from "@/types";

/** How a value is printed on the paper document (not how the UI formats it). */
function printed(field: ExtractionField, raw: string): string {
  if (field === "amount") {
    const n = Number(raw);
    return Number.isFinite(n) ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n) : raw;
  }
  if ((field === "issue_date" || field === "maturity_date") && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}-${m}-${y}`;
  }
  return raw;
}

const PRINTED_LABEL: Partial<Record<ExtractionField, string>> = {
  instrument_no: "Receipt No.",
  beneficiary: "Depositor",
  amount: "Amount (₹)",
  issue_date: "Date of deposit",
  maturity_date: "Date of maturity",
  lien_holder: "Lien marked in favour of",
};

/** Review threshold from policy rule EXTRACTION_REVIEW_THRESHOLD (demo configuration). */
export const LOW_CONFIDENCE = 0.9;

interface ReplicaProps {
  document: DocumentRecord;
  extractions: DocumentExtraction[];
  instrument?: FinancialInstrument;
  institutionName: string;
  activeField?: ExtractionField | null;
  onSelectField?: (f: ExtractionField) => void;
}

/**
 * HTML replica of a synthetic document. Field positions come from RECEIPT_LAYOUT, the same boxes the
 * extractions reference, so a highlighted region is exactly where the value was read from.
 * Sized with container-query units so the paper scales as one piece at any width.
 */
export function DocumentReplica(props: ReplicaProps) {
  return (
    <div className="@container relative aspect-[1.55/1] w-full overflow-hidden rounded-md border bg-[#fbfaf7] text-[#1d2433] shadow-soft select-none dark:bg-[#ece9e1]">
      {props.document.kind === "fdr_receipt" ? <Receipt {...props} /> : <Letter {...props} />}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] text-[6cqw] font-bold tracking-[0.2em] whitespace-nowrap text-[#1d2433]/[0.05]"
      >
        SYNTHETIC · NOT VALID
      </span>
    </div>
  );
}

function Receipt({ extractions, instrument, institutionName, activeField, onSelectField }: ReplicaProps) {
  const value = (field: ExtractionField): string => {
    const e = extractions.find((x) => x.field === field);
    if (e) return printed(field, e.value);
    if (!instrument) return "";
    const fallback: Record<ExtractionField, string> = {
      bank_name: instrument.bankName,
      instrument_no: instrument.instrumentNo,
      beneficiary: institutionName,
      amount: (instrument.amountPaise / 100).toFixed(2),
      issue_date: instrument.issueDate,
      maturity_date: instrument.maturityDate ?? "",
      lien_holder: instrument.lienHolder,
    };
    return printed(field, fallback[field]);
  };

  const fields = Object.keys(RECEIPT_LAYOUT) as ExtractionField[];
  return (
    <>
      {/* Static print */}
      <div className="absolute inset-x-[5%] top-[4%] h-px" aria-hidden />
      <p className="absolute top-[7%] right-[8%] text-[1.9cqw] font-semibold tracking-[0.12em] text-[#1d2433]/70">
        FIXED DEPOSIT RECEIPT
      </p>
      <p className="absolute top-[12.5%] left-[8%] text-[1.35cqw] text-[#1d2433]/60">
        {instrument ? `${instrument.branch} · IFSC ${instrument.ifsc}` : ""}
      </p>
      <div className="absolute top-[15.5%] right-[5%] left-[5%] h-px bg-[#1d2433]/20" aria-hidden />
      <div className="absolute top-[70%] right-[5%] left-[5%] h-px bg-[#1d2433]/15" aria-hidden />
      <p className="absolute top-[73%] left-[8%] w-[52%] text-[1.15cqw] leading-snug text-[#1d2433]/55">
        Interest payable as per the bank&apos;s terms. This receipt is not transferable. Premature withdrawal requires
        the written consent of the lien holder.
      </p>
      <div className="absolute top-[82%] right-[8%] w-[26%] border-t border-[#1d2433]/40 pt-[0.6cqw] text-center text-[1.2cqw] text-[#1d2433]/60">
        Authorised signatory
      </div>

      {fields.map((f) => {
        const box = RECEIPT_LAYOUT[f];
        const isHeader = f === "bank_name";
        return (
          <div key={f} className="absolute" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}>
            {!isHeader && PRINTED_LABEL[f] && (
              <span className="absolute -top-[1.8cqw] left-0 text-[1.15cqw] tracking-wide text-[#1d2433]/55 uppercase">
                {PRINTED_LABEL[f]}
              </span>
            )}
            <span
              className={cn(
                "flex h-full items-center truncate",
                isHeader ? "text-[2.6cqw] font-bold tracking-tight" : f === "amount" ? "font-mono text-[2.3cqw] font-semibold" : "font-mono text-[1.75cqw]",
              )}
            >
              {value(f)}
            </span>
          </div>
        );
      })}

      {/* Evidence overlay: one region per extraction */}
      {extractions.map((e) => {
        const active = activeField === e.field;
        const low = e.confidence < LOW_CONFIDENCE;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelectField?.(e.field)}
            aria-pressed={active}
            aria-label={`${EXTRACTION_FIELD_LABELS[e.field]} region, confidence ${Math.round(e.confidence * 100)}%`}
            className={cn(
              "absolute rounded-[0.4cqw] border-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? low
                  ? "border-status-warning bg-status-warning/15"
                  : "border-primary bg-primary/10"
                : "border-transparent hover:border-primary/40 hover:bg-primary/5",
            )}
            style={{
              left: `calc(${e.bbox.x * 100}% - 0.6cqw)`,
              top: `calc(${e.bbox.y * 100}% - 0.4cqw)`,
              width: `calc(${e.bbox.w * 100}% + 1.2cqw)`,
              height: `calc(${e.bbox.h * 100}% + 0.8cqw)`,
            }}
          >
            {active && (
              <span
                className={cn(
                  "absolute -top-[3.2cqw] right-0 rounded-[0.4cqw] px-[0.8cqw] py-[0.2cqw] font-sans text-[1.3cqw] font-medium whitespace-nowrap text-white",
                  low ? "bg-status-warning" : "bg-primary",
                )}
              >
                {EXTRACTION_FIELD_LABELS[e.field]} · {Math.round(e.confidence * 100)}%
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function Letter({ document, institutionName }: ReplicaProps) {
  return (
    <div className="absolute inset-[6%] flex flex-col">
      <p className="text-[2.2cqw] font-bold tracking-tight">{institutionName}</p>
      <div className="mt-[1cqw] h-px bg-[#1d2433]/20" />
      <p className="mt-[3cqw] text-center text-[1.9cqw] font-semibold tracking-[0.1em] uppercase">{DOCUMENT_KIND_LABELS[document.kind]}</p>
      <div className="mt-[3cqw] space-y-[1.4cqw]" aria-hidden>
        {[92, 88, 95, 70, 90, 84, 60].map((w, i) => (
          <div key={i} className="h-[0.9cqw] rounded-full bg-[#1d2433]/12" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between text-[1.25cqw] text-[#1d2433]/60">
        <span className="font-mono">{document.fileName}</span>
        <span className="w-[28%] border-t border-[#1d2433]/40 pt-[0.6cqw] text-center">Signature &amp; seal</span>
      </div>
    </div>
  );
}
