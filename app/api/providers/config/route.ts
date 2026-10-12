import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import logger from "@/lib/logger";
import { withUser, parseBody, notFound } from "@/lib/api";
import { checkOutboundUrl } from "@/lib/url-guard";
import type { ProviderConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

const configSchema = z.object({
  provider: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  type: z.enum(["local", "remote"]),
  baseUrl: z.string().max(500).optional().or(z.literal("")),
  apiKey: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  config: z.string().max(10_000).optional().nullable(),
});

// API keys never leave the server; the client only learns whether one is stored.
const toPublic = ({ apiKey, ...rest }: ProviderConfig) => ({ ...rest, hasApiKey: !!apiKey });

export const GET = withUser(async (_req, user) => {
  const configs = await db.query.providerConfigs.findMany({
    where: eq(schema.providerConfigs.userId, user.id),
  });
  return NextResponse.json(configs.map(toPublic));
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, configSchema);
  if (error) return error;

  const baseUrl = data.baseUrl || null;
  if (baseUrl) {
    const problem = await checkOutboundUrl(baseUrl);
    if (problem) return NextResponse.json({ error: `Base URL: ${problem}` }, { status: 400 });
  }

  const values = {
    name: data.name,
    type: data.type,
    baseUrl,
    enabled: data.enabled ?? true,
    config: data.config ?? null,
    updatedAt: new Date(),
    // Omitted/blank key on update = keep the stored one.
    ...(data.apiKey?.trim() ? { apiKey: encrypt(data.apiKey.trim()) } : {}),
  };

  try {
    const [saved] = await db
      .insert(schema.providerConfigs)
      .values({ userId: user.id, provider: data.provider, ...values })
      .onConflictDoUpdate({
        target: [schema.providerConfigs.userId, schema.providerConfigs.provider],
        set: values,
      })
      .returning();
    return NextResponse.json(toPublic(saved));
  } catch (err) {
    logger.error({ err }, "Error saving provider config");
    return NextResponse.json({ error: "Failed to save provider configuration" }, { status: 500 });
  }
});

export const DELETE = withUser(async (req, user) => {
  const provider = new URL(req.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });

  const deleted = await db
    .delete(schema.providerConfigs)
    .where(
      and(eq(schema.providerConfigs.userId, user.id), eq(schema.providerConfigs.provider, provider)),
    )
    .returning({ id: schema.providerConfigs.id });
  if (!deleted.length) return notFound();
  return NextResponse.json({ success: true });
});
