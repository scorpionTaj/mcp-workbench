import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import logger from "@/lib/logger";
import { ownKnowledgeBaseIds } from "@/lib/agents";
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
  knowledgeBaseIds: z.array(z.string()).max(20).optional(),
});

// ?archived=1 lists archived chats; otherwise the active ones, pinned first.
export const GET = withUser(async (req, user) => {
  const archived = req.nextUrl.searchParams.get("archived") === "1";
  try {
    const chats = await db.query.chats.findMany({
      where: and(
        eq(schema.chats.userId, user.id),
        archived ? isNotNull(schema.chats.archivedAt) : isNull(schema.chats.archivedAt),
      ),
      limit: 200,
      orderBy: [sql`${schema.chats.pinnedAt} desc nulls last`, desc(schema.chats.updatedAt)],
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
        pinned: chat.pinnedAt !== null,
        archived: chat.archivedAt !== null,
        folderId: chat.folderId,
        tags: chat.tags,
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
        knowledgeBaseIds: await ownKnowledgeBaseIds(user.id, data.knowledgeBaseIds ?? []),
      })
      .returning();
    return NextResponse.json(chat);
  } catch (err) {
    logger.error({ err }, "Error creating chat");
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
});
