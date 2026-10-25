"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { portalFor, ROLE_LABELS } from "@/lib/authz";
import { DEMO_USERS, ENTRY_ROLES } from "@/data/people";
import { useDemoStore } from "@/store/demo-store";
import { useSession } from "@/store/hooks";

export function RoleSwitcher() {
  const router = useRouter();
  const session = useSession();
  const enterAs = useDemoStore((s) => s.enterAs);
  const signOut = useDemoStore((s) => s.signOut);
  if (!session) return null;

  function switchTo(userId: string) {
    const next = enterAs(userId);
    if (next) router.push(`/${portalFor(next.role)}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[12rem] gap-1.5">
          <span className="truncate">{ROLE_LABELS[session.role]}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Switch demo role</DropdownMenuLabel>
        {ENTRY_ROLES.map(({ userId }) => {
          const user = DEMO_USERS.find((u) => u.id === userId)!;
          const active = session.userId === userId;
          return (
            <DropdownMenuItem key={userId} onSelect={() => switchTo(userId)} className="items-start gap-2 py-2">
              <Check className={active ? "mt-0.5 size-4 text-primary" : "mt-0.5 size-4 opacity-0"} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{ROLE_LABELS[user.role]}</p>
                <p className="truncate text-xs text-muted-foreground">{user.name}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            router.push("/enter");
          }}
          className="gap-2"
        >
          <LogOut className="size-4" aria-hidden />
          Back to role selection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
