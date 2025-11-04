import { type NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/drizzle-db";
import { z } from "zod";
import logger from "@/lib/logger";
import { cachedChats } from "@/lib/db-cached";
import { cacheInvalidate } from "@/lib/cache";

const createChatSchema = z.object({
  title: z.string().optional(),
  systemPrompt: z.string().optional(),
  defaultProvider: z
    .enum([
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
      "custom",
    ])
    .default("ollama"),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    // Use cached version for better performance
    const chats = await cachedChats();

    const formatted = chats.map((chat: any) => ({
      id: chat.id,
      title: chat.title || "New Chat",
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages?.length ?? 0,
      lastMessage: chat.messages?.[0]
        ? {
            content:
              typeof chat.messages[0].content === "string"
                ? chat.messages[0].content.slice(0, 100)
                : JSON.stringify(chat.messages[0].content).slice(0, 100),
            createdAt: chat.messages[0].createdAt,
          }
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error({ err: error }, "Error fetching chats");
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createChatSchema.parse(body);

    const now = new Date();
    const [chat] = await db
      .insert(schema.chats)
      .values({
        title: data.title,
        createdAt: now,
        updatedAt: now,
        systemPrompt: data.systemPrompt,
        defaultProvider: data.defaultProvider,
        defaultModelId: data.defaultModelId,
        toolServerIds: data.toolServerIds
          ? JSON.stringify(data.toolServerIds)
          : null,
      })
      .returning();

    // Invalidate chats list cache
    await cacheInvalidate.allChats();

    return NextResponse.json(chat);
  } catch (error) {
    logger.error({ err: error }, "Error creating chat");
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
