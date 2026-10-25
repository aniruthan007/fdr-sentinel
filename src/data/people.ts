import type { DemoUser } from "@/types";

/** One fictional demo identity per role. No passwords: the /enter page signs in by role. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "u-owner",
    name: "Priya Raman",
    role: "institution_owner",
    title: "Principal, Kaveri Institute of Technology",
    institutionId: "inst-kit",
    email: "priya.raman@kit.example",
  },
  {
    id: "u-operator",
    name: "Karthik Subramanian",
    role: "institution_operator",
    title: "Accounts Officer, Kaveri Institute of Technology",
    institutionId: "inst-kit",
    email: "karthik.s@kit.example",
  },
  {
    id: "u-po",
    name: "Arjun Mehta",
    role: "processing_officer",
    title: "Processing Officer, Deposit Cell",
    email: "arjun.mehta@ops.example",
  },
  {
    id: "u-co",
    name: "Farah Siddiqui",
    role: "clearance_officer",
    title: "Clearance Officer",
    email: "farah.siddiqui@ops.example",
  },
  {
    id: "u-ap",
    name: "Dr. Vikram Rao",
    role: "approver",
    title: "Deputy Director (Approver)",
    email: "vikram.rao@ops.example",
  },
  {
    id: "u-sup",
    name: "Neha Kulkarni",
    role: "supervisor",
    title: "Section Supervisor",
    email: "neha.kulkarni@ops.example",
  },
  {
    id: "u-aud",
    name: "Meera Iyer",
    role: "auditor",
    title: "Internal Auditor",
    email: "meera.iyer@ops.example",
  },
  {
    id: "u-sys",
    name: "Rahul Verma",
    role: "system_admin",
    title: "System Administrator",
    email: "rahul.verma@ops.example",
  },
  {
    id: "u-pol",
    name: "Anita Desai",
    role: "policy_admin",
    title: "Policy Administrator",
    email: "anita.desai@ops.example",
  },
];

/** The five roles offered on /enter and in the role switcher, in story order. */
export const ENTRY_ROLES: { userId: string; blurb: string }[] = [
  { userId: "u-owner", blurb: "Submit deposits, upload receipts, renew FDRs and request releases for Kaveri Institute of Technology." },
  { userId: "u-po", blurb: "Verify instruments against documents, raise findings and request corrections." },
  { userId: "u-co", blurb: "Record departmental clearances on release requests." },
  { userId: "u-ap", blurb: "Record the final decision on cases that are ready." },
  { userId: "u-aud", blurb: "Read-only view of every record and the tamper-evident audit chain." },
];

export function demoUser(id: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}
