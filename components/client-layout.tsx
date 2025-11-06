"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        forcedTheme="dark"
        disableTransitionOnChange
      >
        {/* Top Header with Logo */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile Menu Button - Left side */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Centered Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 group transition-all hover:scale-105 absolute left-1/2 transform -translate-x-1/2"
            >
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="MCP Workbench"
                  width={32}
                  height={32}
                  className="rounded-lg group-hover:animate-pulse-glow"
                />
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="font-bold text-lg leading-tight group-hover:text-gradient transition-colors">
                  MCP Workbench
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  AI Development Hub
                </span>
              </div>
            </Link>
            
            {/* Empty div to maintain flex balance - Right side */}
            <div className="w-10"></div>
          </div>
        </header>
        
        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1">
          <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          <main className="flex-1 lg:ml-64 transition-all duration-300">
            <div className="p-4 max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
      </ThemeProvider>
    </ErrorBoundary>
  );
}