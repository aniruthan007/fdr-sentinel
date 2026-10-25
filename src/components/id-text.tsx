"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdTextProps {
  value: string;
  /** Show only the first N characters (hashes); the full value is copied. */
  truncate?: number;
  className?: string;
}

/** Identifiers, references and hashes: monospace with one-click copy. */
export function IdText({ value, truncate, className }: IdTextProps) {
  const [copied, setCopied] = useState(false);
  const shown = truncate && value.length > truncate ? `${value.slice(0, truncate)}…` : value;

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be unavailable (insecure context); the value is still selectable.
    }
  }

  return (
    <span className={cn("group/id inline-flex max-w-full items-center gap-1 font-mono text-[0.8125rem]", className)}>
      <span className="truncate" title={value}>
        {shown}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${value}`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 group-hover/id:opacity-100"
      >
        {copied ? <Check className="size-3 text-status-success" /> : <Copy className="size-3" />}
      </button>
    </span>
  );
}
