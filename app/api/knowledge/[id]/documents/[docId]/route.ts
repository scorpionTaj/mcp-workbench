import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; docId: string }> };

/** GET returns the document's chunks (for inspecting how it was split). */
export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { id, docId } = await params;
  const doc = await ownedDocument(user.id, id, docId);
  if (!doc) return notFound();
  const chunks = await db
    .select({ position: schema.knowledgeChunks.position, content: schema.knowledgeChunks.content })
    .from(schema.knowledgeChunks)
    .where(eq(schema.knowledgeChunks.documentId, doc.id))
    .orderBy(schema.knowledgeChunks.position);
  return NextResponse.json({ ...doc, chunks });
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id, docId } = await params;
  const doc = await ownedDocument(user.id, id, docId);
  if (!doc) return notFound();
  await db.delete(schema.knowledgeDocuments).where(eq(schema.knowledgeDocuments.id, doc.id));
  return NextResponse.json({ success: true });
});

async function ownedDocument(userId: string, kbId: string, docId: string) {
  const [row] = await db
    .select({ doc: schema.knowledgeDocuments })
    .from(schema.knowledgeDocuments)
    .innerJoin(schema.knowledgeBases, eq(schema.knowledgeBases.id, schema.knowledgeDocuments.knowledgeBaseId))
    .where(
      and(
        eq(schema.knowledgeDocuments.id, docId),
        eq(schema.knowledgeDocuments.knowledgeBaseId, kbId),
        eq(schema.knowledgeBases.userId, userId),
      ),
    );
  return row?.doc;
}
