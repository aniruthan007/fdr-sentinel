import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { PrototypeBanner } from "@/components/prototype-banner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Deposit Docket — Security Deposit & FDR Management Portal (Prototype)", template: "%s · Deposit Docket" },
  description:
    "Prototype portal for continuing security-deposit obligations, FDR instruments, replacements and releases. Every replacement linked. Every decision backed by current evidence. SIH 2026 · Team MAVERICKS (SIH1277). Synthetic data; not connected to AICTE or any bank.",
  applicationName: "Deposit Docket",
  openGraph: {
    title: "Deposit Docket — every replacement linked, every decision backed by current evidence",
    description: "Replacement-impact checks, evidence-version reviews and stale-decision guards for security deposits. SIH 2026 prototype by Team MAVERICKS (SIH1277) — synthetic data only.",
    type: "website",
    siteName: "Deposit Docket",
  },
  twitter: { card: "summary", title: "Deposit Docket", description: "Security Deposit & FDR Management Portal — SIH 2026 prototype, synthetic data only." },
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
