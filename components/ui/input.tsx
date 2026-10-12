"use client";

import * as React from "react";
import { Input as HeroInput } from "@heroui/react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <HeroInput
      data-slot="input"
      fullWidth
      className={cn("file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium", className)}
      {...(props as React.ComponentProps<typeof HeroInput>)}
    />
  );
}

export { Input };
