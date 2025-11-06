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
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useProviders } from "@/hooks/use-providers";
import { Button } from "@/components/ui/button";

// Define navigation items
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/providers", label: "Providers", icon: Plug, showBadge: true },
  { href: "/registry", label: "Registry", icon: Package },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/embeddings", label: "Embeddings", icon: Database },
  { href: "/notebook", label: "Notebook", icon: BookOpen },
  { href: "/feedback", label: "Feedback", icon: MessageCircle },
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

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar = memo(function Sidebar({
  mobileMenuOpen = false,
  setMobileMenuOpen = () => {},
}: SidebarProps) {
  const pathname = usePathname();
  const { providers } = useProviders();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(false);

  // Calculate provider and model counts
  const connectedProvidersCount = useMemo(
    () => providers.filter((p) => p.connected).length,
    [providers]
  );
  const totalModelsCount = useMemo(
    () =>
      providers.reduce(
        (acc, provider) => acc + (provider.models?.length || 0),
        0
      ),
    [providers]
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 bg-card border-r border-border transition-all duration-300",
          "hidden lg:flex flex-col",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Collapse Toggle Button - Always visible */}
        <div className="p-2 border-b border-border flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 h-auto hover:bg-secondary"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const showBadge = item.showBadge;

              // Determine if this item should show a count badge when collapsed
              let countToShow = null;
              if (item.href === "/providers") {
                countToShow =
                  connectedProvidersCount > 0 ? connectedProvidersCount : null;
              } else if (item.href === "/models") {
                countToShow = totalModelsCount > 0 ? totalModelsCount : null;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200",
                    isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <div
                    className={
                      isCollapsed
                        ? "justify-center w-full relative"
                        : "relative"
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {isCollapsed && (showBadge || countToShow) && (
                      <span
                        className={`absolute -top-1 -right-0.5 bg-red-500 text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1 ${
                          countToShow && countToShow >= 100 ? "text-[10px]" : ""
                        }`}
                      >
                        {showBadge ? connectedProvidersCount : countToShow}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="flex-1 truncate">{item.label}</span>
                      {(showBadge || countToShow) && (
                        <span className="ml-2 bg-red-500 text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                          {showBadge ? connectedProvidersCount : countToShow}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Developer Info Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <div
              className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-accent rounded-md p-2 transition-colors"
              onClick={() => setShowDevInfo(true)}
            >
              <div className="bg-secondary rounded-full p-1">
                <img
                  src="/placeholder-user.jpg"
                  alt="Tajeddine Bourhim"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Tajeddine Bourhim</p>
                <a
                  href="https://scorpiontaj.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  scorpiontaj.me
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Developer Image for Collapsed Sidebar */}
        {isCollapsed && (
          <div className="p-3 border-t border-border flex justify-center">
            <div
              className="bg-secondary rounded-full p-1 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setShowDevInfo(true)}
            >
              <img
                src="/placeholder-user.jpg"
                alt="Tajeddine Bourhim"
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Developer Info Modal */}
        {showDevInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDevInfo(false)}
          >
            <div
              className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDevInfo(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <img
                  src="/placeholder-user.jpg"
                  alt="Tajeddine Bourhim"
                  width={80}
                  height={80}
                  className="rounded-full object-cover mb-4"
                />
                <h3 className="text-xl font-bold">Tajeddine Bourhim</h3>
                <p className="text-muted-foreground mb-2">
                  Full Stack Developer & AI Integration Specialist
                </p>

                <div className="w-full mt-4 space-y-3">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Portfolio</span>
                    <a
                      href="https://scorpiontaj.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      scorpiontaj.me
                    </a>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">
                      Specialization
                    </span>
                    <span>Full Stack Dev & AI Integration</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Location</span>
                    <span>Morocco</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Focus</span>
                    <span>LLMs, Tools, & AI Workflows</span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Developer of MCP Workbench - a unified interface for LLM chat,
                  MCP tools, and data science utilities.
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Menu - Full Screen Overlay */}
      {mobileMenuOpen && (
        <div className="fixed top-0 left-0 z-50 w-full h-full bg-card lg:hidden flex flex-col">
          {/* Mobile Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="MCP Workbench"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </div>
              <div>
                <span className="font-bold text-lg">MCP Workbench</span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
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
                      "flex items-center justify-between w-full p-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
            </nav>
          </div>
        </div>
      )}
    </>
  );
});
