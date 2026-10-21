import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { checkEmbeddingModel, checkReranker, knowledgeBaseSchema } from "@/lib/knowledge-schema";

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
  const embeddingProblem = await checkEmbeddingModel(user, data.embeddingProvider, data.embeddingModel);
  if (embeddingProblem) return NextResponse.json({ error: embeddingProblem }, { status: 400 });
  const rerankProblem = await checkReranker(user, data);
  if (rerankProblem) return NextResponse.json({ error: rerankProblem }, { status: 400 });
  const [row] = await db
    .insert(kb)
    .values({ ...data, userId: user.id })
    .onConflictDoNothing()
    .returning();
  if (!row) return NextResponse.json({ error: `A knowledge base named ${data.name} already exists` }, { status: 409 });
  return NextResponse.json(row, { status: 201 });
});
