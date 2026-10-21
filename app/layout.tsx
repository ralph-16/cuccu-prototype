import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CuccuPOS — Café POS & Management",
  description: "CuccuPOS — point-of-sale and shop management for Cuccu Café.",
  icons: { icon: "/cuccupos-logo.svg", apple: "/cuccupos-logo.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", quicksand.variable)}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
