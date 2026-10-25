"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDemoStore } from "@/store/demo-store";

export function ResetDemoButton() {
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    const result = await resetDemo();
    setBusy(false);
    if (result.ok) toast.success("Demo data reset", { description: "Every record is back to the seeded state." });
    else toast.error("Could not reset", { description: result.error });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" aria-label="Reset demo">
          <RotateCcw className="size-3.5" />
          <span className="hidden md:inline">Reset demo</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
          <AlertDialogDescription>
            Everything you changed in this browser — uploads, findings, clearances, decisions — is discarded and the
            seeded demo data is restored. Your current role is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={reset} disabled={busy}>
            Reset demo data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
