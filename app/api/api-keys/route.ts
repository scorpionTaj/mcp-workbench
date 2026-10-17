import { NextResponse } from "next/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { apiKeyColumns, generateApiKey } from "@/lib/api-keys";

const MAX_ACTIVE_KEYS = 20;

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

// Managing keys needs the session: a leaked key must not be able to mint or revoke keys.
export const GET = withUser(
  async (_req, user) => {
    const keys = await db
      .select(apiKeyColumns)
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, user.id))
      .orderBy(desc(schema.apiKeys.createdAt));
    return NextResponse.json(keys);
  },
  { sessionOnly: true },
);

/** Creates a key. The response is the only time the full key is shown. */
export const POST = withUser(
  async (req, user) => {
    const { data, error } = await parseBody(req, createSchema);
    if (error) return error;
    const [{ active }] = await db
      .select({ active: count() })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.userId, user.id), isNull(schema.apiKeys.revokedAt)));
    if (active >= MAX_ACTIVE_KEYS) {
      return NextResponse.json({ error: `You can have at most ${MAX_ACTIVE_KEYS} active keys` }, { status: 400 });
    }
    const { key, prefix, hash } = generateApiKey();
    const [row] = await db
      .insert(schema.apiKeys)
      .values({ userId: user.id, name: data.name, prefix, hash })
      .returning(apiKeyColumns);
    return NextResponse.json({ ...row, key }, { status: 201 });
  },
  { sessionOnly: true },
);
