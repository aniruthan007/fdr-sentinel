import {
  Bell,
  BookCheck,
  Building2,
  CalendarClock,
  FileStack,
  FileText,
  Gavel,
  LayoutDashboard,
  Landmark,
  ListChecks,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Undo2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { INSTITUTION_ROLES, OFFICIAL_ROLES, type Portal, type Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  roles: readonly Role[];
  /** Roadmap phase (CLAUDE.md §9) that builds the full page. */
  phase: number;
  summary: string;
}

const INST = INSTITUTION_ROLES;
const ALL_OFFICIAL = OFFICIAL_ROLES;

export const INSTITUTION_NAV: NavItem[] = [
  { href: "/institution", label: "Overview", icon: LayoutDashboard, group: "Institution", roles: INST, phase: 3, summary: "Your deposits, open requests and what needs your attention." },
  { href: "/institution/deposits", label: "Deposit register", icon: Landmark, group: "Institution", roles: INST, phase: 3, summary: "Every obligation and the instruments that secure it." },
  { href: "/institution/documents", label: "Documents", icon: FileText, group: "Institution", roles: INST, phase: 3, summary: "Uploaded receipts, affidavits and letters, with extracted fields to confirm." },
  { href: "/institution/releases", label: "Release requests", icon: Undo2, group: "Requests", roles: INST, phase: 3, summary: "Ask for a deposit to be released and track clearances." },
  { href: "/institution/renewals", label: "Renewals", icon: RefreshCcw, group: "Requests", roles: INST, phase: 3, summary: "Instruments nearing maturity and their renewal lineage." },
  { href: "/institution/notifications", label: "Notifications", icon: Bell, group: "Requests", roles: INST, phase: 3, summary: "Reminders, correction requests and decisions." },
];

export const OFFICIAL_NAV: NavItem[] = [
  { href: "/official", label: "Overview", icon: LayoutDashboard, group: "Workspace", roles: ALL_OFFICIAL, phase: 4, summary: "Your queue and what changed since you last looked." },
  { href: "/official/cases", label: "Verification cases", icon: ListChecks, group: "Workspace", roles: ["processing_officer", "supervisor", "approver", "auditor"], phase: 4, summary: "Deposit, renewal and release cases with findings and checklists." },
  { href: "/official/releases", label: "Release requests", icon: Undo2, group: "Workspace", roles: ["processing_officer", "approver", "supervisor", "auditor"], phase: 4, summary: "Release requests reviewed against the Clause 6.46 checklist." },
  { href: "/official/clearances", label: "Clearances", icon: ShieldCheck, group: "Workspace", roles: ["clearance_officer", "supervisor", "auditor"], phase: 4, summary: "Clearance outcomes for release requests (SIMULATED sources). Clearance officers see only their assigned clearances." },
  { href: "/official/decisions", label: "Decisions", icon: Gavel, group: "Workspace", roles: ["approver", "supervisor", "auditor"], phase: 4, summary: "Cases ready for a recorded decision." },
  { href: "/official/instruments", label: "Instruments", icon: FileStack, group: "Records", roles: ["processing_officer", "supervisor", "approver", "auditor"], phase: 4, summary: "Every FDR, RPGF and RTGS instrument across institutions." },
  { href: "/official/institutions", label: "Institutions", icon: Building2, group: "Records", roles: ["processing_officer", "approver", "supervisor", "auditor"], phase: 4, summary: "Institutions, their obligations and deposit coverage." },
  { href: "/official/maturity", label: "Maturity radar", icon: CalendarClock, group: "Records", roles: ["processing_officer", "supervisor", "approver", "auditor"], phase: 4, summary: "Instruments maturing in the next 90 days." },
  { href: "/official/audit", label: "Audit log", icon: ScrollText, group: "Oversight", roles: ["auditor"], phase: 4, summary: "Tamper-evident, hash-chained record of every action." },
  { href: "/official/reports", label: "Reports", icon: BarChart3, group: "Oversight", roles: ["auditor", "supervisor", "approver"], phase: 5, summary: "Coverage, maturity and turnaround reports with CSV export." },
  { href: "/official/policy", label: "Policy & checklists", icon: BookCheck, group: "Oversight", roles: ["policy_admin", "auditor"], phase: 5, summary: "Versioned, source-linked rules and checklists." },
  { href: "/official/notifications", label: "Notifications", icon: Bell, group: "Oversight", roles: ALL_OFFICIAL, phase: 5, summary: "Alerts routed to your role." },
];

export function navFor(portal: Portal, role: Role): NavItem[] {
  const items = portal === "institution" ? INSTITUTION_NAV : OFFICIAL_NAV;
  return items.filter((i) => i.roles.includes(role));
}

/**
 * The nav item that owns a path — exact match, else the longest prefix — so a detail page such as
 * /official/cases/vc-01 inherits the role gating of /official/cases. Portal roots match only exactly.
 */
export function navItemFor(pathname: string): NavItem | undefined {
  const items = [...INSTITUTION_NAV, ...OFFICIAL_NAV];
  const exact = items.find((i) => i.href === pathname);
  if (exact) return exact;
  return items
    .filter((i) => i.href.split("/").length > 2 && pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Roadmap phases (CLAUDE.md §8) whose screens are fully built; other pages show a "coming in Phase N" note. */
export const COMPLETED_PHASES: ReadonlySet<number> = new Set([1, 2, 3, 4]);
