import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { slug } from "@/lib/bundles";

const commandSchema = z.object({
  name: z.string().trim().min(1).max(64).transform(slug),
  description: z.string().max(500).optional().nullable(),
  argumentHint: z.string().max(200).optional().nullable(),
  prompt: z.string().min(1).max(20_000),
});

export const GET = withUser(async (_req, user) => {
  const rows = await db.query.commands.findMany({
    where: eq(schema.commands.userId, user.id),
    orderBy: [asc(schema.commands.name)],
  });
  return NextResponse.json(rows);
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, commandSchema);
  if (error) return error;
  const [cmd] = await db
    .insert(schema.commands)
    .values({ ...data, userId: user.id })
    .onConflictDoNothing()
    .returning();
  if (!cmd) return NextResponse.json({ error: `/${data.name} already exists` }, { status: 409 });
  return NextResponse.json(cmd, { status: 201 });
});

/** PATCH ?id= edits a command or toggles it ({ enabled }). */
export const PATCH = withUser(async (req, user) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { data, error } = await parseBody(req, commandSchema.partial().extend({ enabled: z.boolean().optional() }));
  if (error) return error;
  try {
    const [cmd] = await db
      .update(schema.commands)
      .set(data)
      .where(and(eq(schema.commands.id, id), eq(schema.commands.userId, user.id)))
      .returning();
    return cmd ? NextResponse.json(cmd) : notFound();
  } catch {
    return NextResponse.json({ error: "A command with that name already exists" }, { status: 409 });
  }
});

export const DELETE = withUser(async (req, user) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = await db
    .delete(schema.commands)
    .where(and(eq(schema.commands.id, id), eq(schema.commands.userId, user.id)))
    .returning();
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
