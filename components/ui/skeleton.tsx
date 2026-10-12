import * as React from "react";
import { Skeleton as HeroSkeleton } from "@heroui/react";

function Skeleton(props: React.ComponentProps<"div">) {
  return <HeroSkeleton data-slot="skeleton" {...props} />;
}

export { Skeleton };
