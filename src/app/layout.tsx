import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
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
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
