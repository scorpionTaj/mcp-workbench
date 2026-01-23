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
  Lightbulb,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useProviders } from "@/hooks/use-providers";
import { Button } from "@/components/ui/button";
import { useSidebarCollapsed, useUIStore } from "@/store/ui-store";

import { ChevronDown } from "lucide-react";

// Define navigation items by category
const navCategories = [
  {
    label: "Chat & Templates",
    icon: MessageSquare,
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/templates", label: "Templates", icon: Lightbulb },
    ],
  },
  {
    label: "Models & Providers",
    icon: Cpu,
    items: [
      { href: "/models", label: "Models", icon: Cpu },
      { href: "/providers", label: "Providers", icon: Plug, showBadge: true },
    ],
  },
  {
    label: "Data & Tools",
    icon: Database,
    items: [
      { href: "/datasets", label: "Datasets", icon: Database },
      { href: "/embeddings", label: "Embeddings", icon: Database },
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/notebook", label: "Notebook", icon: BookOpen },
    ],
  },
  {
    label: "System & Config",
    icon: Settings,
    items: [
      { href: "/registry", label: "Registry", icon: Package },
      { href: "/health", label: "Health", icon: Activity },
      { href: "/feedback", label: "Feedback", icon: MessageCircle },
      { href: "/config", label: "Config", icon: Settings },
    ],
  },
];

// Separate the badge count component to prevent re-rendering the entire nav
const ProvidersBadge = memo(function ProvidersBadge() {
  const { providers } = useProviders();
  const connectedCount = useMemo(
    () => providers.filter((p) => p.connected).length,
    [providers],
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
  const isCollapsed = useSidebarCollapsed();
  const { toggleSidebarCollapsed } = useUIStore();
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "Chat & Templates",
    "Models & Providers",
  ]);

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );
  };

  // Calculate provider and model counts
  const connectedProvidersCount = useMemo(
    () => providers.filter((p) => p.connected).length,
    [providers],
  );
  const totalModelsCount = useMemo(
    () =>
      providers.reduce(
        (acc, provider) => acc + (provider.models?.length || 0),
        0,
      ),
    [providers],
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
          "min-h-[calc(100vh-4rem)] z-40 bg-card border-r border-border transition-all duration-300 shrink-0",
          "hidden lg:flex flex-col",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Collapse Toggle Button - Always visible */}
        <div className="p-2 border-b border-border flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSidebarCollapsed()}
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
          <nav className="space-y-2 px-2">
            {/* Dashboard Link - Always visible */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "relative flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200 mb-4",
                isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                pathname === "/"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>

            {/* Categorized Navigation */}
            {navCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.label);
              const hasActiveItem = category.items.some(
                (item) => pathname === item.href,
              );

              return (
                <div key={category.label} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() =>
                      !isCollapsed && toggleCategory(category.label)
                    }
                    className={cn(
                      "relative flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200",
                      isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                      hasActiveItem && !isCollapsed
                        ? "bg-primary/5 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <category.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate text-left">
                          {category.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform duration-200 shrink-0",
                            isExpanded ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      </>
                    )}
                  </button>

                  {/* Category Items */}
                  {!isCollapsed && isExpanded && (
                    <div className="space-y-1 ml-2 border-l border-border/50 pl-2">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const showBadge = item.showBadge;
                        let countToShow = null;
                        if (item.href === "/providers") {
                          countToShow =
                            connectedProvidersCount > 0
                              ? connectedProvidersCount
                              : null;
                        } else if (item.href === "/models") {
                          countToShow =
                            totalModelsCount > 0 ? totalModelsCount : null;
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center justify-between gap-3 w-full rounded-lg text-sm transition-all duration-200 px-3 py-2",
                              isActive
                                ? "bg-primary/10 text-primary border-l-2 border-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {(showBadge || countToShow) && (
                              <span className="ml-2 bg-red-500 text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1 shrink-0">
                                {showBadge
                                  ? connectedProvidersCount
                                  : countToShow}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed Mode - Show all items as collapsed group */}
                  {isCollapsed && (
                    <div className="space-y-1 pt-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const showBadge = item.showBadge;
                        let countToShow = null;
                        if (item.href === "/providers") {
                          countToShow =
                            connectedProvidersCount > 0
                              ? connectedProvidersCount
                              : null;
                        } else if (item.href === "/models") {
                          countToShow =
                            totalModelsCount > 0 ? totalModelsCount : null;
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "relative flex items-center justify-center w-full rounded-lg p-3 transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                            )}
                            title={item.label}
                          >
                            <div className="relative">
                              <Icon className="w-5 h-5" />
                              {(showBadge || countToShow) && (
                                <span
                                  className={`absolute -top-1 -right-0.5 bg-red-500 text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1`}
                                >
                                  {showBadge
                                    ? connectedProvidersCount
                                    : countToShow}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              {/* Dashboard */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between w-full p-3 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </div>
              </Link>

              {/* Categorized Navigation for Mobile */}
              {navCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.label);
                const hasActiveItem = category.items.some(
                  (item) => pathname === item.href,
                );

                return (
                  <div key={category.label} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(category.label)}
                      className={cn(
                        "flex items-center justify-between w-full p-3 rounded-lg text-sm font-medium transition-all duration-200",
                        hasActiveItem
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className="w-5 h-5" />
                        <span>{category.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded ? "rotate-0" : "-rotate-90",
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-1 ml-2 border-l border-border/50 pl-2">
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          const showBadge = item.showBadge;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center justify-between w-full p-3 rounded-lg text-sm transition-all duration-200",
                                isActive
                                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                              </div>
                              {showBadge && <ProvidersBadge />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
});
