import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const pricePerM = z.number().min(0).max(100_000);

// Each field that is present is set; null clears that override.
const overrideSchema = z
  .object({
    provider: z.string().min(1),
    modelId: z.string().min(1),
    isReasoning: z.boolean().nullable().optional(),
    // USD per 1M tokens; overrides the built-in price table (lib/pricing.ts).
    price: z.object({ input: pricePerM, output: pricePerM }).nullable().optional(),
  })
  .refine((o) => o.isReasoning !== undefined || o.price !== undefined, "Set isReasoning or price");

export const GET = withUser(async (_req, user) => {
  const overrides = await db.query.modelOverrides.findMany({
    where: eq(schema.modelOverrides.userId, user.id),
    orderBy: [schema.modelOverrides.provider, schema.modelOverrides.modelId],
  });
  return NextResponse.json(overrides);
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, overrideSchema);
  if (error) return error;
  const set = {
    ...(data.isReasoning !== undefined && { isReasoning: data.isReasoning }),
    ...(data.price !== undefined && {
      inputPricePerM: data.price?.input ?? null,
      outputPricePerM: data.price?.output ?? null,
    }),
  };
  const [override] = await db
    .insert(schema.modelOverrides)
    .values({ userId: user.id, provider: data.provider, modelId: data.modelId, ...set })
    .onConflictDoUpdate({
      target: [schema.modelOverrides.userId, schema.modelOverrides.provider, schema.modelOverrides.modelId],
      set: { ...set, updatedAt: new Date() },
    })
    .returning();
  return NextResponse.json(override);
});
