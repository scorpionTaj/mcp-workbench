"use client";

import * as React from "react";
import { Label as HeroLabel } from "@heroui/react";

function Label(props: React.ComponentProps<"label">) {
  return <HeroLabel data-slot="label" {...(props as React.ComponentProps<typeof HeroLabel>)} />;
}

export { Label };
