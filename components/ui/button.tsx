import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { buttonVariants as heroButtonVariants } from "@heroui/react";
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

/**
 * A native <button> with HeroUI's button classes (its documented CSS-class API). Native rather than
 * React Aria's Button so Radix triggers (`<DropdownMenuTrigger asChild>`), forms and keyboard
 * activation keep working exactly as before.
 */
function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={buttonVariants({ variant, size, className })} {...props} />;
}

export { Button, buttonVariants };
