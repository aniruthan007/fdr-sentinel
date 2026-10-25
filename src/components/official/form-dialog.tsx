"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/store/demo-store";

interface FormDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  submitLabel: string;
  /** Toast shown when the command succeeds. */
  successMessage: string;
  /** Returns the command result; the dialog closes only on success and shows the error otherwise. */
  onSubmit: () => Promise<ActionResult>;
  canSubmit?: boolean;
  destructive?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function FormDialog({ trigger, title, description, submitLabel, successMessage, onSubmit, canSubmit = true, destructive, onOpenChange, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(next: boolean) {
    setOpen(next);
    setError(null);
    onOpenChange?.(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await onSubmit();
    setBusy(false);
    if (result.ok) {
      toast.success(successMessage);
      change(false);
    }
    else setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">{children}</div>
          {error && (
            <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => change(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !canSubmit} variant={destructive ? "destructive" : "default"}>
              {busy ? "Recording…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Radio-style choice list; keyboard accessible via native radio inputs. */
export function ChoiceGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  columns = 1,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: Choice<T>[];
  columns?: 1 | 2;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2")}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            value === o.value ? "border-primary/50 bg-accent" : "hover:bg-muted/60",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-0.5 accent-[var(--primary)]"
          />
          <span>
            <span className="block font-medium">{o.label}</span>
            {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
