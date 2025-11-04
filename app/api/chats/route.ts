import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import logger from "@/lib/logger";

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
    const chats = await prisma.chat.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = chats.map((chat) => ({
      id: chat.id,
      title: chat.title || "New Chat",
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat._count.messages,
      lastMessage: chat.messages[0]
        ? {
            content: chat.messages[0].content.slice(0, 100),
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

    const chat = await prisma.chat.create({
      data: {
        title: data.title,
        systemPrompt: data.systemPrompt,
        defaultProvider: data.defaultProvider,
        defaultModelId: data.defaultModelId,
        toolServerIds: data.toolServerIds
          ? JSON.stringify(data.toolServerIds)
          : null,
      },
    });

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
