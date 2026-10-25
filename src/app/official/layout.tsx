import type { Metadata } from "next";
import { PortalShell } from "@/components/shell/portal-shell";

export const metadata: Metadata = { title: "Official Operations Portal" };

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="official">{children}</PortalShell>;
}
