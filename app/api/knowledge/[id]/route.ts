import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { patchSchema } from "@/lib/patch-schema";
import { knowledgeBaseSchema } from "../route";

type Ctx = { params: Promise<{ id: string }> };
const { knowledgeBases: kb } = schema;
const owns = (userId: string, id: string) => and(eq(kb.id, id), eq(kb.userId, userId));

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const row = await db.query.knowledgeBases.findFirst({ where: owns(user.id, (await params).id) });
  if (!row) return notFound();
  const documents = await db.query.knowledgeDocuments.findMany({
    where: eq(schema.knowledgeDocuments.knowledgeBaseId, row.id),
    orderBy: [desc(schema.knowledgeDocuments.createdAt)],
  });
  return NextResponse.json({ ...row, documents });
});

// The embedding model and chunking are fixed once documents exist; only the label changes.
export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { data, error } = await parseBody(req, patchSchema(knowledgeBaseSchema.pick({ name: true, description: true })));
  if (error) return error;
  try {
    const [row] = await db
      .update(kb)
      .set({ ...data, updatedAt: new Date() })
      .where(owns(user.id, (await params).id))
      .returning();
    return row ? NextResponse.json(row) : notFound();
  } catch {
    return NextResponse.json({ error: "A knowledge base with that name already exists" }, { status: 409 });
  }
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const deleted = await db.delete(kb).where(owns(user.id, (await params).id)).returning();
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
