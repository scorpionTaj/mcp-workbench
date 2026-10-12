import { NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { agentInputSchema, ownServerIds, visibleTo } from "@/lib/agents";

export const GET = withUser(async (_req, user) => {
  const rows = await db.query.agents.findMany({
    where: visibleTo(user.id),
    orderBy: [desc(schema.agents.usageCount), asc(schema.agents.name)],
    limit: 200,
  });
  return NextResponse.json(
    rows.map((a) => ({
      ...a,
      // Server ids are only meaningful to the agent's owner.
      toolServerIds: a.userId === user.id ? a.toolServerIds : [],
      owner: a.userId === null ? "builtin" : a.userId === user.id ? "me" : "community",
    })),
  );
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, agentInputSchema);
  if (error) return error;
  const [agent] = await db
    .insert(schema.agents)
    .values({ ...data, userId: user.id, toolServerIds: await ownServerIds(user.id, data.toolServerIds) })
    .returning();
  return NextResponse.json(agent, { status: 201 });
});
