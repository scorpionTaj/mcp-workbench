import * as React from "react";
import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";

// The app's badge API, rendered as a HeroUI Chip.
const VARIANT = {
  default: { color: "accent", variant: "primary" },
  secondary: { color: "default", variant: "secondary" },
  destructive: { color: "danger", variant: "soft" },
  outline: { color: "default", variant: "tertiary" },
} as const;

function Badge({
  className,
  variant = "default",
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "color"> & { variant?: keyof typeof VARIANT | null }) {
  return (
    <Chip
      data-slot="badge"
      size="sm"
      {...VARIANT[variant ?? "default"]}
      className={cn("gap-1 [&>svg]:size-3 [&>svg]:shrink-0", className)}
      {...props}
    >
      {children}
    </Chip>
  );
}

export { Badge };
