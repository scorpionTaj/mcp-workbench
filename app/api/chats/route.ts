import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import logger from "@/lib/logger";
import { withUser, parseBody } from "@/lib/api";

export const PROVIDERS = [
  "ollama",
  "lmstudio",
  "openai",
  "anthropic",
  "google",
  "groq",
  "openrouter",
  "together",
  "mistral",
  "cohere",
  "huggingface",
  "replicate",
  "custom",
] as const;

const createChatSchema = z.object({
  title: z.string().max(200).optional(),
  systemPrompt: z.string().max(20_000).optional(),
  defaultProvider: z.enum(PROVIDERS).default("ollama"),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
});

export const GET = withUser(async (_req, user) => {
  try {
    const chats = await db.query.chats.findMany({
      where: eq(schema.chats.userId, user.id),
      limit: 50,
      orderBy: [desc(schema.chats.updatedAt)],
      extras: {
        messageCount:
          sql<number>`(select count(*)::int from "Message" m where m."chatId" = "chats"."id")`.as(
            "messageCount",
          ),
      },
      with: {
        messages: {
          limit: 1,
          orderBy: [desc(schema.messages.createdAt)],
          columns: { content: true, createdAt: true },
        },
      },
    });

    return NextResponse.json(
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title || "New Chat",
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messageCount,
        lastMessage: chat.messages[0]
          ? {
              content: chat.messages[0].content.slice(0, 100),
              createdAt: chat.messages[0].createdAt,
            }
          : null,
      })),
    );
  } catch (error) {
    logger.error({ err: error }, "Error fetching chats");
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, createChatSchema);
  if (error) return error;
  try {
    const [chat] = await db
      .insert(schema.chats)
      .values({
        userId: user.id,
        title: data.title,
        systemPrompt: data.systemPrompt,
        defaultProvider: data.defaultProvider,
        defaultModelId: data.defaultModelId,
        toolServerIds: data.toolServerIds ? JSON.stringify(data.toolServerIds) : null,
      })
      .returning();
    return NextResponse.json(chat);
  } catch (err) {
    logger.error({ err }, "Error creating chat");
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
});
