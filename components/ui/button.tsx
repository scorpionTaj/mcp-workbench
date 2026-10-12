"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Button as HeroButton, buttonVariants as heroButtonVariants } from "@heroui/react";
import { cn } from "@/lib/utils";

// The app's button API (shadcn-style variant/size/asChild), rendered by HeroUI.
const VARIANT = {
  default: "primary",
  destructive: "danger",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "ghost",
} as const;

type Variant = keyof typeof VARIANT;
type Size = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

const SIZE: Record<Size, { size: "sm" | "md" | "lg"; isIconOnly?: true }> = {
  default: { size: "md" },
  sm: { size: "sm" },
  lg: { size: "lg" },
  icon: { size: "md", isIconOnly: true },
  "icon-sm": { size: "sm", isIconOnly: true },
  "icon-lg": { size: "lg", isIconOnly: true },
};

function buttonVariants({ variant = "default", size = "default", className }: { variant?: Variant | null; size?: Size | null; className?: string } = {}) {
  return cn(
    heroButtonVariants({ variant: VARIANT[variant ?? "default"], ...SIZE[size ?? "default"] }),
    variant === "link" && "underline-offset-4 hover:underline",
    className,
  );
}

type ButtonProps = Omit<React.ComponentProps<"button">, "color"> & {
  variant?: Variant | null;
  size?: Size | null;
  /** Renders the child element (e.g. a link) with button styling. */
  asChild?: boolean;
};

function Button({ className, variant, size, asChild = false, disabled, children, ...props }: ButtonProps) {
  if (asChild) {
    return (
      <Slot data-slot="button" className={buttonVariants({ variant, size, className })} {...props}>
        {children}
      </Slot>
    );
  }
  const { size: heroSize, isIconOnly } = SIZE[size ?? "default"];
  return (
    <HeroButton
      data-slot="button"
      variant={VARIANT[variant ?? "default"]}
      size={heroSize}
      isIconOnly={isIconOnly}
      isDisabled={disabled}
      className={cn(variant === "link" && "underline-offset-4 hover:underline", className)}
      {...(props as React.ComponentProps<typeof HeroButton>)}
    >
      {children}
    </HeroButton>
  );
}

export { Button, buttonVariants };
