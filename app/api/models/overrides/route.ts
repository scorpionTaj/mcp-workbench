import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const overrideSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  isReasoning: z.boolean(),
});

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
  const [override] = await db
    .insert(schema.modelOverrides)
    .values({ userId: user.id, ...data })
    .onConflictDoUpdate({
      target: [schema.modelOverrides.userId, schema.modelOverrides.provider, schema.modelOverrides.modelId],
      set: { isReasoning: data.isReasoning, updatedAt: new Date() },
    })
    .returning();
  return NextResponse.json(override);
});
