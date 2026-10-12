import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { LIMITS, slug } from "@/lib/bundles";

export const skillInputSchema = z.object({
  name: z.string().trim().min(1).max(64).transform(slug),
  description: z.string().trim().min(1).max(1000),
  instructions: z.string().min(1).max(LIMITS.instructions),
  resources: z
    .record(z.string().max(300), z.string())
    .refine((r) => Object.values(r).reduce((n, t) => n + t.length, 0) <= LIMITS.resourcesTotal, "Resources exceed 1 MB")
    .default({}),
  enabled: z.boolean().default(true),
});

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
