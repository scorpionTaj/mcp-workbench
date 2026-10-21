import { z } from "zod";
import { LIMITS, slug } from "@/lib/bundles";

export const skillInputSchema = z.object({
  name: z.string().trim().min(1).max(64).transform(slug),
  description: z.string().trim().min(1).max(1000),
  instructions: z.string().min(1).max(LIMITS.instructions),
  resources: z
    .record(z.string().max(300), z.string())
    .refine((r) => Object.values(r).reduce((n, t) => n + t.length, 0) <= LIMITS.resourcesTotal, "Resources exceed 1 MB")
    .default({}),
  enabled: z.boolean().default(true),
});
