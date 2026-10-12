import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { visibleAgent } from "@/lib/agents";

/** Starts a new chat with an agent; the chat stays linked so agent edits apply to it. */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async (_req, user, { params }) => {
  const agent = await visibleAgent(user.id, (await params).id);
  if (!agent) return notFound();

  const [chat] = await db
    .insert(schema.chats)
    .values({
      userId: user.id,
      agentId: agent.id,
      title: agent.name,
      ...(agent.provider && agent.modelId && { defaultProvider: agent.provider, defaultModelId: agent.modelId }),
    })
    .returning();
  await db
    .update(schema.agents)
    .set({ usageCount: sql`${schema.agents.usageCount} + 1` })
    .where(eq(schema.agents.id, agent.id));
  return NextResponse.json(chat, { status: 201 });
});
