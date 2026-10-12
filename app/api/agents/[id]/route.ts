import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { agentInputSchema, ownServerIds, ownedBy, visibleAgent } from "@/lib/agents";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const agent = await visibleAgent(user.id, (await params).id);
  if (!agent) return notFound();
  return NextResponse.json({ ...agent, toolServerIds: agent.userId === user.id ? agent.toolServerIds : [] });
});

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, agentInputSchema.partial());
  if (error) return error;
  const [agent] = await db
    .update(schema.agents)
    .set({
      ...data,
      ...(data.toolServerIds && { toolServerIds: await ownServerIds(user.id, data.toolServerIds) }),
      updatedAt: new Date(),
    })
    .where(ownedBy(user.id, id))
    .returning();
  if (!agent) return notFound();
  return NextResponse.json(agent);
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const deleted = await db.delete(schema.agents).where(ownedBy(user.id, (await params).id)).returning();
  if (!deleted.length) return notFound();
  return NextResponse.json({ success: true });
});
