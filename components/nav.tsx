"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Cpu,
  Package,
  Wrench,
  Database,
  LayoutDashboard,
  BookOpen,
  Settings,
} from "lucide-react";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/registry", label: "Registry", icon: Package },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/notebook", label: "Notebook", icon: BookOpen },
  { href: "/config", label: "Config", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="MCP Workbench"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-semibold text-lg">Workbench</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
