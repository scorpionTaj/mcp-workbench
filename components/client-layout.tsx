"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUIStore } from "@/store/ui-store";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSidebarCollapsed } from "@/store/ui-store";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";

// Auth pages render without the app shell.
const BARE_ROUTES = ["/sign-in", "/sign-up"];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openPalette = useUIStore((s) => s.setCommandPaletteOpen);
  const bare = BARE_ROUTES.includes(usePathname());

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {bare ? (
          children
        ) : (
        // Fixed-height shell: the header and sidebar stay put and <main> is the one page scroller.
        <div className="flex h-dvh flex-col overflow-hidden">
          {/* Top Header with Logo */}
          <header className="sticky top-0 z-50 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-3 px-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-lg p-2 hover:bg-default"
                aria-label="Toggle menu"
              >
                <Menu className="size-5" />
              </button>

              <Link href="/" className="group flex items-center gap-2.5">
                <Image src="/logo.svg" alt="" width={28} height={28} className="rounded-lg group-hover:animate-pulse-glow" />
                <span className="font-semibold tracking-tight max-sm:sr-only">
                  MCP <span className="text-gradient">Workbench</span>
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => openPalette(true)}
                  className="flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-surface/60 px-3 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground md:w-64"
                  aria-label="Search and run commands"
                >
                  <Search className="size-4" />
                  <span className="max-md:sr-only">Search or jump to…</span>
                  <kbd className="ml-auto rounded-md border border-border/70 px-1.5 text-[10px] font-medium max-md:hidden">⌘K</kbd>
                </button>
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </header>

          {/* Main Content Area with Sidebar */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Sidebar
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
            <main
              id="main-content"
              className="min-h-0 w-full flex-1 overflow-y-auto"
              role="main"
            >
              <div className="mx-auto max-w-400 p-4 md:p-6">{children}</div>
            </main>
          </div>
          <CommandPalette />
        </div>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
