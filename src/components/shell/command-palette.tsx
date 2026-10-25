"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Building2, FileStack, FileText, ListChecks, Moon, Search, UserRound, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/status-badge";
import { caseHref } from "@/components/tables/columns";
import { DEMO_USERS, ENTRY_ROLES } from "@/data/people";
import { DOCUMENT_KIND_LABELS } from "@/data/documents";
import { isInstitutionRole, portalFor, ROLE_LABELS } from "@/lib/authz";
import { latestCaseFor } from "@/lib/institution";
import { navFor } from "@/lib/nav";
import { instrumentDisplayStatus } from "@/lib/status";
import { useDemoStore } from "@/store/demo-store";
import { useDemoData, useSession, useToday } from "@/store/hooks";

/**
 * ⌘K / Ctrl+K: jump to any page, institution, instrument, case or request the current role may open.
 * Results are scoped exactly like the routes: institutions see only their own records.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const d = useDemoData();
  const session = useSession();
  const today = useToday();
  const enterAs = useDemoStore((s) => s.enterAs);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    if (!session) return null;
    const role = session.role;
    const portal = portalFor(role);
    const nav = navFor(portal, role);
    const can = (href: string) => nav.some((n) => n.href === href);
    const inst = isInstitutionRole(role);
    const mine = <T extends { institutionId: string }>(xs: T[]) => (inst ? xs.filter((x) => x.institutionId === session.institutionId) : xs);

    return {
      nav,
      institutions: !inst && can("/official/institutions") ? d.institutions : [],
      instruments: inst || can("/official/instruments") ? mine(d.instruments) : [],
      cases: !inst && can("/official/cases") ? d.cases : [],
      releases: inst || can("/official/releases") ? mine(d.releaseRequests) : [],
      documents: inst ? mine(d.documents) : [],
      inst,
    };
  }, [d, session]);

  if (!session || !groups) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const instrumentHref = (id: string, no: string) => {
    if (groups!.inst) return `/institution/deposits/${id}`;
    const c = latestCaseFor(d, id);
    return c ? caseHref(c) : `/official/instruments?q=${encodeURIComponent(no)}`;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="size-3.5" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] lg:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to a page or record">
        {/* This shadcn CommandDialog does not render the cmdk root itself, so the palette provides it. */}
        <Command>
        <CommandInput placeholder={groups.inst ? "Search your instruments, requests, documents…" : "Search institutions, instruments, cases, requests…"} />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>No matches.</CommandEmpty>

          <CommandGroup heading="Go to">
            {groups.nav.map((n) => (
              <CommandItem key={n.href} value={`page ${n.label}`} onSelect={() => go(n.href)}>
                <n.icon /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {groups.cases.length > 0 && (
            <CommandGroup heading="Cases">
              {groups.cases.map((c) => (
                <CommandItem key={c.id} value={`case ${c.ref} ${c.title} ${d.institutions.find((i) => i.id === c.institutionId)?.name}`} onSelect={() => go(caseHref(c))}>
                  <ListChecks />
                  <span className="font-mono text-xs">{c.ref}</span>
                  <span className="truncate text-muted-foreground">{c.title}</span>
                  <StatusBadge status={c.status} className="ml-auto h-5 text-[10px]" noHint />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groups.releases.length > 0 && (
            <CommandGroup heading="Release requests">
              {groups.releases.map((r) => (
                <CommandItem key={r.id} value={`release ${r.ref} ${d.institutions.find((i) => i.id === r.institutionId)?.name}`} onSelect={() => go(groups.inst ? `/institution/releases/${r.id}` : `/official/releases/${r.id}`)}>
                  <Undo2 />
                  <span className="font-mono text-xs">{r.ref}</span>
                  <StatusBadge status={r.status} className="ml-auto h-5 text-[10px]" noHint />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groups.instruments.length > 0 && (
            <CommandGroup heading="Instruments">
              {groups.instruments.map((i) => (
                <CommandItem key={i.id} value={`instrument ${i.instrumentNo} ${i.bankName} ${d.institutions.find((x) => x.id === i.institutionId)?.shortName}`} onSelect={() => go(instrumentHref(i.id, i.instrumentNo))}>
                  <FileStack />
                  <span className="font-mono text-xs">{i.instrumentNo}</span>
                  {!groups.inst && <span className="text-muted-foreground">{d.institutions.find((x) => x.id === i.institutionId)?.shortName}</span>}
                  <StatusBadge status={instrumentDisplayStatus(i, today)} className="ml-auto h-5 text-[10px]" noHint />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groups.institutions.length > 0 && (
            <CommandGroup heading="Institutions">
              {groups.institutions.map((i) => (
                <CommandItem key={i.id} value={`institution ${i.name} ${i.shortName} ${i.refCode} ${i.city} ${i.state}`} onSelect={() => go(`/official/institutions?q=${encodeURIComponent(i.name)}`)}>
                  <Building2 />
                  {i.name}
                  <span className="ml-auto text-xs text-muted-foreground">{i.city}, {i.state}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groups.documents.length > 0 && (
            <CommandGroup heading="Documents">
              {groups.documents.map((x) => (
                <CommandItem key={x.id} value={`document ${x.fileName} ${DOCUMENT_KIND_LABELS[x.kind]}`} onSelect={() => go(`/institution/documents?doc=${x.id}`)}>
                  <FileText />
                  <span className="truncate">{x.fileName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{DOCUMENT_KIND_LABELS[x.kind]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem value="toggle theme dark light" onSelect={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setOpen(false); }}>
              <Moon /> Toggle dark mode
            </CommandItem>
            {ENTRY_ROLES.filter((r) => r.userId !== session.userId).map(({ userId }) => {
              const u = DEMO_USERS.find((x) => x.id === userId)!;
              return (
                <CommandItem
                  key={userId}
                  value={`switch role ${ROLE_LABELS[u.role]} ${u.name}`}
                  onSelect={() => {
                    const s = enterAs(userId);
                    if (s) go(`/${portalFor(s.role)}`);
                  }}
                >
                  <UserRound /> Switch to {ROLE_LABELS[u.role]}
                  <CommandShortcut>{u.name}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
