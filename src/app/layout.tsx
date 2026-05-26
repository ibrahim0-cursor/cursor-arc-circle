import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARC CIRCLE | NEXUS + PRISM Agent Suite",
  description:
    "Autonomous trading and macro forecasting agents for the Agora Hackathon — built on Circle + Arc testnet.",
  openGraph: {
    title: "ARC CIRCLE Agent Intelligence Suite",
    description: "NEXUS trading agent and PRISM macro oracle on Arc testnet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#050508] antialiased">
        <AppProviders>
          <Navbar />
          <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 [&:has([data-nexus-page])]:pb-0">
            {children}
          </main>
          <MobileBottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
