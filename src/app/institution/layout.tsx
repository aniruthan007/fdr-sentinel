import type { Metadata } from "next";
import { PortalShell } from "@/components/shell/portal-shell";

export const metadata: Metadata = { title: "Institution Portal" };

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="institution">{children}</PortalShell>;
}
