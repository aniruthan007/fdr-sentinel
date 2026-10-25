"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { can } from "@/lib/authz";
import { useSession } from "@/store/hooks";
import type { ActionResult } from "@/store/demo-store";
import type { Action } from "@/types";

/** Runs a store command with a busy flag and a toast for the outcome. */
export function useCommand() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (task: () => Promise<ActionResult>, success: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const result = await task();
      if (result.ok) toast.success(success);
      else toast.error("Not recorded", { description: result.error });
      return result;
    } finally {
      setBusy(false);
    }
  }, []);
  return { run, busy };
}

/**
 * UI mirror of `can()`. Hides or disables controls; the store command checks again, so this is a
 * convenience, not the access control.
 */
export function useCan(action: Action, resourceInstitutionId?: string): boolean {
  const session = useSession();
  if (!session) return false;
  return can(session.role, action, { actorInstitutionId: session.institutionId, resourceInstitutionId });
}
