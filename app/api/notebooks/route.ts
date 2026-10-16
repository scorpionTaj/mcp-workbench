import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { notebookInputSchema } from "@/lib/notebook";

// Writes echo back the metadata only; the client already has the cells it sent.
export const summary = {
  id: schema.notebooks.id,
  title: schema.notebooks.title,
  createdAt: schema.notebooks.createdAt,
  updatedAt: schema.notebooks.updatedAt,
};

export const GET = withUser(async (_req, user) => {
  // The list omits cells (figures make them large); GET /api/notebooks/:id returns everything.
  const notebooks = await db
    .select({
      ...summary,
      cellCount: sql<number>`jsonb_array_length(${schema.notebooks.cells})`.mapWith(Number),
    })
    .from(schema.notebooks)
    .where(eq(schema.notebooks.userId, user.id))
    .orderBy(desc(schema.notebooks.updatedAt));
  return NextResponse.json(notebooks);
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, notebookInputSchema);
  if (error) return error;
  const [notebook] = await db
    .insert(schema.notebooks)
    .values({ ...data, userId: user.id })
    .returning(summary);
  return NextResponse.json(notebook, { status: 201 });
});
