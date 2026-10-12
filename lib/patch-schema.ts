import { z } from "zod";

/**
 * The PATCH version of a create schema: every field optional and no defaults.
 * zod 4 still applies `.default()` inside `.partial()`, so a plain partial would reset
 * omitted fields (e.g. toggling `enabled` would wipe a skill's files).
 */
export function patchSchema<S extends z.ZodRawShape>(schema: z.ZodObject<S>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [key, field instanceof z.ZodDefault ? field.unwrap() : field]),
  ) as { [K in keyof S]: S[K] extends z.ZodDefault<infer T> ? T : S[K] };
  return z.object(shape).partial();
}
