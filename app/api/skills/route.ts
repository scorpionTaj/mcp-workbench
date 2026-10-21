import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { skillInputSchema } from "@/lib/skill-schema";

export const GET = withUser(async (_req, user) => {
  const skills = await db.query.skills.findMany({
    where: eq(schema.skills.userId, user.id),
    orderBy: [asc(schema.skills.name)],
  });
  // The list omits file contents; GET /api/skills/:id returns everything.
  return NextResponse.json(
    skills.map(({ resources, instructions, ...s }) => ({
      ...s,
      files: Object.keys(resources),
      instructionsLength: instructions.length,
    })),
  );
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, skillInputSchema);
  if (error) return error;
  const [skill] = await db
    .insert(schema.skills)
    .values({ ...data, userId: user.id })
    .onConflictDoNothing()
    .returning();
  if (!skill) return NextResponse.json({ error: `A skill named ${data.name} already exists` }, { status: 409 });
  return NextResponse.json(skill, { status: 201 });
});
