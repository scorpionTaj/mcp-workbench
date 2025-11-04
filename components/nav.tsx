"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMemo, memo, useState } from "react";
import {
  MessageSquare,
  Cpu,
  Package,
  Wrench,
  Database,
  LayoutDashboard,
  BookOpen,
  Settings,
  Plug,
  Activity,
  Menu,
  X,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useProviders } from "@/hooks/use-providers";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/providers", label: "Providers", icon: Plug, showBadge: true },
  { href: "/registry", label: "Registry", icon: Package },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/notebook", label: "Notebook", icon: BookOpen },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/config", label: "Config", icon: Settings },
];

// Separate the badge count component to prevent re-rendering the entire nav
const ProvidersBadge = memo(function ProvidersBadge() {
  const { providers } = useProviders();
  const connectedCount = useMemo(
    () => providers.filter((p) => p.connected).length,
    [providers]
  );

  return connectedCount > 0 ? (
    <Badge
      variant="secondary"
      className="ml-1 h-5 px-1.5 text-[10px] bg-success/20 text-success border-success/30"
    >
      {connectedCount}
    </Badge>
  ) : null;
});

export const Nav = memo(function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-3 group transition-all hover:scale-105"
              onClick={() => setMobileMenuOpen(false)}
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
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight group-hover:text-gradient transition-colors">
                  MCP Workbench
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  AI Development Hub
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const showBadge = item.showBadge;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {showBadge && <ProvidersBadge />}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-1 animate-in slide-in-from-top duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const showBadge = item.showBadge;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && <ProvidersBadge />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
});
