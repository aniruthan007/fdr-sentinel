"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { portalFor, ROLE_LABELS } from "@/lib/authz";
import { navItemFor } from "@/lib/nav";
import { useDemoReady, useSession } from "@/store/hooks";
import type { Portal } from "@/types";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { ResetDemoButton } from "./reset-demo-button";
import { CommandPalette } from "./command-palette";
import { RoleSwitcher } from "./role-switcher";
import { ThemeToggle } from "./theme-toggle";

/**
 * Layout for both portals. In this demo layer the role check runs in the browser; in production the
 * same `can()` check runs server-side and in Postgres RLS (see docs/architecture.md).
 */
export function PortalShell({ portal, children }: { portal: Portal; children: React.ReactNode }) {
  const ready = useDemoReady();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const wrongPortal = session ? portalFor(session.role) !== portal : false;

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/enter");
    else if (wrongPortal) router.replace(`/${portalFor(session.role)}`);
  }, [ready, session, wrongPortal, router]);

  if (!ready || !session || wrongPortal) return <ShellSkeleton />;

  const item = navItemFor(pathname);
  const permitted = !item || item.roles.includes(session.role);

  return (
    <div className="flex h-full">
      <aside className="hidden h-full w-60 shrink-0 border-r bg-sidebar lg:block">
        <AppSidebar portal={portal} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar portal={portal} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <Breadcrumbs />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <CommandPalette />
            <RoleSwitcher />
            <ResetDemoButton />
            <ThemeToggle />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {permitted ? (
            children
          ) : (
            <EmptyState
              icon={Lock}
              title="Not available for your role"
              description={`${ROLE_LABELS[session.role]} cannot open ${item?.label ?? "this page"}. In production this is a 403 from the server, not just a hidden link.`}
            />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-full" aria-busy="true" aria-label="Loading demo">
      <div className="hidden w-60 shrink-0 space-y-3 border-r bg-sidebar p-4 lg:block">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-6 h-4 w-24" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-14 items-center border-b px-6">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}
