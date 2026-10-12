import { NextResponse } from "next/server";
import { db, schema, ownedChat } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import logger from "@/lib/logger";
import { withUser, parseBody, notFound } from "@/lib/api";
import { PROVIDERS } from "../route";

type Ctx = { params: Promise<{ id: string }> };

const updateChatSchema = z.object({
  title: z.string().max(200).optional(),
  systemPrompt: z.string().max(20_000).optional(),
  defaultProvider: z.enum(PROVIDERS).optional(),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
});

const owns = (userId: string, id: string) =>
  and(eq(schema.chats.id, id), eq(schema.chats.userId, userId));

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  try {
    const { id } = await params;
    const chat = await db.query.chats.findFirst({
      where: owns(user.id, id),
      with: {
        messages: {
          orderBy: [schema.messages.createdAt],
          with: { attachments: true },
        },
      },
    });
    if (!chat) return notFound();

    return NextResponse.json({
      ...chat,
      toolServerIds: chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [],
      meta: chat.meta ? JSON.parse(chat.meta) : null,
      messages: chat.messages.map((msg) => ({
        ...msg,
        toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : null,
        toolResults: msg.toolResults ? JSON.parse(msg.toolResults) : null,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching chat");
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
  }
});

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, updateChatSchema);
  if (error) return error;
  if (!(await ownedChat(user.id, id))) return notFound();

  try {
    const { toolServerIds, ...rest } = data;
    const [chat] = await db
      .update(schema.chats)
      .set({
        ...rest,
        ...(toolServerIds !== undefined && { toolServerIds: JSON.stringify(toolServerIds) }),
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
