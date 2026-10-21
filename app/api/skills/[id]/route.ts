import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { patchSchema } from "@/lib/patch-schema";
import { skillInputSchema } from "@/lib/skill-schema";

type Ctx = { params: Promise<{ id: string }> };
const owns = (userId: string, id: string) => and(eq(schema.skills.id, id), eq(schema.skills.userId, userId));

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const skill = await db.query.skills.findFirst({ where: owns(user.id, (await params).id) });
  return skill ? NextResponse.json(skill) : notFound();
});

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { data, error } = await parseBody(req, patchSchema(skillInputSchema));
  if (error) return error;
  try {
    const [skill] = await db
      .update(schema.skills)
      .set({ ...data, updatedAt: new Date() })
      .where(owns(user.id, (await params).id))
      .returning();
    return skill ? NextResponse.json(skill) : notFound();
  } catch {
    return NextResponse.json({ error: "A skill with that name already exists" }, { status: 409 });
  }
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const deleted = await db.delete(schema.skills).where(owns(user.id, (await params).id)).returning();
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
