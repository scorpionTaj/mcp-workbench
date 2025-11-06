import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/client-layout";
import {
  SkipNav,
  KeyboardNavIndicator,
} from "@/components/accessibility/skip-nav";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "MCP Workbench",
  description:
    "Unified interface for LLM chat, MCP tools, and data science utilities",
  generator: "v0.app",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SkipNav />
        <KeyboardNavIndicator />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
