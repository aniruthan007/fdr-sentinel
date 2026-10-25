"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/authz";
import { useDemoData, useSession } from "@/store/hooks";
import type { Portal } from "@/types";
import { Brand } from "./brand";

export function AppSidebar({ portal, onNavigate }: { portal: Portal; onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useSession();
  const data = useDemoData();
  if (!session) return null;

  const items = navFor(portal, session.role);
  const groups = [...new Set(items.map((i) => i.group))];
  const institution = session.institutionId ? data.institutions.find((i) => i.id === session.institutionId) : undefined;
  const root = portal === "institution" ? "/institution" : "/official";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Brand href={root} />
      </div>

      <div className="border-b px-4 py-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {portal === "institution" ? "Institution Portal" : "Official Operations"}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium" title={institution?.name}>
          {institution ? institution.name : ROLE_LABELS[session.role]}
        </p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Primary">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group}</p>
            <ul className="space-y-0.5">
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {session.name
              .replace(/^Dr\.\s*/, "")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.name}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[session.role]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
