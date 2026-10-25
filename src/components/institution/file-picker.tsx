"use client";

import { useId, useRef } from "react";
import { FileUp, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/store/demo-store";
import type { DocumentKind } from "@/types";

function formatSize(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

interface FilePickerProps {
  kind: DocumentKind;
  value: Attachment | null;
  onChange: (a: Attachment | null) => void;
  /** Used to name the synthetic sample file. */
  sampleName: string;
  label?: string;
}

/**
 * Picks a file but keeps only its name and size — the contents never leave the browser.
 * "Use a sample file" lets a judge continue without a PDF to hand.
 */
export function FilePicker({ kind, value, onChange, sampleName, label }: FilePickerProps) {
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
        <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.fileName}</p>
          <p className="text-xs text-muted-foreground">{formatSize(value.sizeBytes)} · kept in this browser only</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Remove ${value.fileName}`}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label htmlFor={inputId} className={cn("flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground")}>
        <FileUp className="size-4 shrink-0" aria-hidden />
        <span>{label ?? "Choose a PDF or image"}</span>
      </label>
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange({ kind, fileName: f.name, sizeBytes: f.size });
          if (ref.current) ref.current.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => onChange({ kind, fileName: `${sampleName}.pdf`, sizeBytes: 120_000 + sampleName.length * 1_731 })}
        className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline sm:self-auto"
      >
        Use a sample file
      </button>
    </div>
  );
}
