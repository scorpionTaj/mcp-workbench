"use client";

import * as React from "react";
import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

// The app's card API, rendered by HeroUI's compound Card.
type DivProps = React.ComponentProps<"div">;

const Card = ({ className, children, ...props }: DivProps) => (
  <HeroCard data-slot="card" className={cn("border border-border/60", className)} {...props}>
    {children}
  </HeroCard>
);
const CardHeader = (props: DivProps) => <HeroCard.Header data-slot="card-header" {...props} />;
const CardTitle = (props: React.ComponentProps<"h3">) => <HeroCard.Title data-slot="card-title" {...props} />;
const CardDescription = (props: React.ComponentProps<"p">) => <HeroCard.Description data-slot="card-description" {...props} />;
const CardContent = (props: DivProps) => <HeroCard.Content data-slot="card-content" {...props} />;
const CardFooter = (props: DivProps) => <HeroCard.Footer data-slot="card-footer" {...props} />;

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
