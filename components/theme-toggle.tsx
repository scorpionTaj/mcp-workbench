"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@heroui/react";

const NEXT = { dark: "light", light: "system", system: "dark" } as const;
const ICON = { dark: Moon, light: Sun, system: Monitor };

/** Cycles dark → light → system. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // The theme is only known on the client; render a stable icon until then.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const current = (mounted && theme && theme in NEXT ? theme : "dark") as keyof typeof NEXT;
  const Icon = ICON[current];
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={`Theme: ${current}. Switch to ${NEXT[current]}`}
      onPress={() => setTheme(NEXT[current])}
    >
      <Icon className="size-4" />
    </Button>
  );
}
