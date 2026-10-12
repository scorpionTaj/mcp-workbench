import { NextResponse } from "next/server";
import { embed } from "ai";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { getEmbeddingModel, ProviderError } from "@/lib/models";

export const knowledgeBaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  embeddingProvider: z.string().min(1).max(50),
  embeddingModel: z.string().min(1).max(200),
  chunkSize: z.number().int().min(200).max(8000).default(1000),
  chunkOverlap: z.number().int().min(0).max(2000).default(150),
});

const { knowledgeBases: kb, knowledgeDocuments: d } = schema;

export const GET = withUser(async (_req, user) => {
  const rows = await db.query.knowledgeBases.findMany({
    where: eq(kb.userId, user.id),
    orderBy: [asc(kb.name)],
    extras: {
      documentCount: sql<number>`(select count(*)::int from ${d} where ${d.knowledgeBaseId} = "knowledgeBases"."id")`.as("documentCount"),
      chunkCount: sql<number>`(select coalesce(sum(${d.chunkCount}), 0)::int from ${d} where ${d.knowledgeBaseId} = "knowledgeBases"."id")`.as("chunkCount"),
    },
  });
  return NextResponse.json(rows);
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, knowledgeBaseSchema);
  if (error) return error;
  // Fail now, not on the first upload, if the embedding model can't be reached.
  try {
    const model = await getEmbeddingModel(user.id, data.embeddingProvider, data.embeddingModel);
    await embed({ model, value: "test", maxRetries: 0 });
  } catch (err) {
    const message = err instanceof ProviderError || err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `Embedding model check failed: ${message}` }, { status: 400 });
  }
  const [row] = await db
    .insert(kb)
    .values({ ...data, userId: user.id })
    .onConflictDoNothing()
    .returning();
  if (!row) return NextResponse.json({ error: `A knowledge base named ${data.name} already exists` }, { status: 409 });
  return NextResponse.json(row, { status: 201 });
});
