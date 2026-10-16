import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { notebookInputSchema } from "@/lib/notebook";
import { summary } from "../route";


type Ctx = { params: Promise<{ id: string }> };
const owns = (userId: string, id: string) =>
  and(eq(schema.notebooks.id, id), eq(schema.notebooks.userId, userId));

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const notebook = await db.query.notebooks.findFirst({ where: owns(user.id, (await params).id) });
  return notebook ? NextResponse.json(notebook) : notFound();
});

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { data, error } = await parseBody(req, notebookInputSchema.partial());
  if (error) return error;
  const [notebook] = await db
    .update(schema.notebooks)
    .set({ ...data, updatedAt: new Date() })
    .where(owns(user.id, (await params).id))
    .returning(summary);
  return notebook ? NextResponse.json(notebook) : notFound();
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const deleted = await db
    .delete(schema.notebooks)
    .where(owns(user.id, (await params).id))
    .returning({ id: schema.notebooks.id });
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
