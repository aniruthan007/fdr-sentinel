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
        <Providers>
          <PrototypeBanner />
          <div className="relative min-h-0 flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
