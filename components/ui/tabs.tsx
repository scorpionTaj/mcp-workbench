"use client";

import * as React from "react";
import { Tabs as HeroTabs } from "@heroui/react";

// The app's tabs API (value / onValueChange, TabsTrigger value), rendered by HeroUI Tabs.
function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <HeroTabs
      data-slot="tabs"
      selectedKey={value}
      defaultSelectedKey={defaultValue}
      onSelectionChange={(key) => onValueChange?.(String(key))}
      className={className}
    >
      {children}
    </HeroTabs>
  );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <HeroTabs.ListContainer>
      <HeroTabs.List className={className}>{children}</HeroTabs.List>
    </HeroTabs.ListContainer>
  );
}

function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <HeroTabs.Tab id={value} className={className}>
      {children}
      <HeroTabs.Indicator />
    </HeroTabs.Tab>
  );
}

function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <HeroTabs.Panel id={value} className={className}>
      {children}
    </HeroTabs.Panel>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
