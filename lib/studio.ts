import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ProviderError } from "@/lib/models";
import logger from "@/lib/logger";
import type { Generation } from "@/lib/schema";

export const STUDIO_LIMITS = { promptChars: 4000, speechChars: 4096, audioBytes: 25 * 1024 * 1024, images: 4 };

export async function recordGeneration(values: Omit<typeof schema.generations.$inferInsert, "id" | "createdAt">): Promise<Generation> {
  const [row] = await db.insert(schema.generations).values(values).returning();
  return row;
}

/** Provider and API errors become a 400 with the provider's message; anything else is logged. */
export function studioError(err: unknown, what: string) {
  if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 400 });
  logger.error({ err }, `Studio ${what} failed`);
  const message = err instanceof Error ? err.message : `${what} failed`;
  return NextResponse.json({ error: message.slice(0, 500) }, { status: 502 });
}
