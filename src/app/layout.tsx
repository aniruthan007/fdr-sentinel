import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { PrototypeBanner } from "@/components/prototype-banner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FDR Sentinel — Security Deposit & FDR Management (Prototype)", template: "%s · FDR Sentinel" },
  description:
    "Prototype portal for tracking security-deposit obligations, FDR instruments, maturity, renewals and releases for technical institutions. SIH 2026 · Team Mavericks. Demo data only.",
  applicationName: "FDR Sentinel",
  openGraph: {
    title: "FDR Sentinel — every security deposit, tracked from submission to release",
    description: "Evidence-linked verification, maturity tracking, clearance-backed release and a tamper-evident audit chain. SIH 2026 prototype by Team Mavericks — demo data only.",
    type: "website",
    siteName: "FDR Sentinel",
  },
  twitter: { card: "summary", title: "FDR Sentinel", description: "Security Deposit & FDR Management — SIH 2026 prototype, demo data only." },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#13151c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="flex h-dvh flex-col overflow-hidden antialiased">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Providers>
          <PrototypeBanner />
          <div className="relative min-h-0 flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
