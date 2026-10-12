import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";

const toggleSchema = z.object({ provider: z.string().min(1), enabled: z.boolean() });

export const PUT = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, toggleSchema);
  if (error) return error;

  const [updated] = await db
    .update(schema.providerConfigs)
    .set({ enabled: data.enabled, updatedAt: new Date() })
    .where(
      and(
        eq(schema.providerConfigs.userId, user.id),
        eq(schema.providerConfigs.provider, data.provider),
      ),
    )
    .returning();
  if (!updated) return notFound();

  const { apiKey, ...rest } = updated;
  return NextResponse.json({ ...rest, hasApiKey: !!apiKey });
});
