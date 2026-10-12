import { NextResponse } from "next/server";
import { db, schema, ownedChat } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import logger from "@/lib/logger";
import { loadChatMessages } from "@/lib/chat-store";
import { ownKnowledgeBaseIds, visibleAgent } from "@/lib/agents";
import { withUser, parseBody, notFound } from "@/lib/api";
import { PROVIDERS } from "../route";

type Ctx = { params: Promise<{ id: string }> };

const updateChatSchema = z.object({
  title: z.string().max(200).optional(),
  systemPrompt: z.string().max(20_000).optional(),
  defaultProvider: z.enum(PROVIDERS).optional(),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
  knowledgeBaseIds: z.array(z.string()).max(20).optional(),
});

const owns = (userId: string, id: string) =>
  and(eq(schema.chats.id, id), eq(schema.chats.userId, userId));

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const chat = await ownedChat(user.id, id);
  if (!chat) return notFound();
  const agent = chat.agentId ? await visibleAgent(user.id, chat.agentId) : undefined;
  return NextResponse.json({
    ...chat,
    toolServerIds: chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [],
    meta: chat.meta ? JSON.parse(chat.meta) : null,
    messages: await loadChatMessages(chat.id),
    agent: agent && {
      id: agent.id,
      name: agent.name,
      icon: agent.icon,
      description: agent.description,
      starterPrompts: agent.starterPrompts,
      temperature: agent.temperature,
    },
  });
});

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, updateChatSchema);
  if (error) return error;
  if (!(await ownedChat(user.id, id))) return notFound();

  try {
    const { toolServerIds, knowledgeBaseIds, ...rest } = data;
    const [chat] = await db
      .update(schema.chats)
      .set({
        ...rest,
        ...(toolServerIds !== undefined && { toolServerIds: JSON.stringify(toolServerIds) }),
        ...(knowledgeBaseIds !== undefined && { knowledgeBaseIds: await ownKnowledgeBaseIds(user.id, knowledgeBaseIds) }),
        updatedAt: new Date(),
      })
      .where(owns(user.id, id))
      .returning();
    return NextResponse.json(chat);
  } catch (err) {
    logger.error({ err }, "Error updating chat");
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
  }
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const deleted = await db.delete(schema.chats).where(owns(user.id, id)).returning({ id: schema.chats.id });
  if (!deleted.length) return notFound();
  return NextResponse.json({ success: true });
});
