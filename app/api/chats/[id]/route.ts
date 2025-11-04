import { type NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/drizzle-db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import logger from "@/lib/logger";

const updateChatSchema = z.object({
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
    .optional(),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    logger.info({ id }, "Fetching chat details");

    const chat = await db.query.chats.findFirst({
      where: eq(schema.chats.id, id),
      with: {
        messages: {
          orderBy: [schema.messages.createdAt],
          with: {
            attachments: true,
          },
        },
      },
    });

    if (!chat) {
      logger.error({ id }, "Chat not found");
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    logger.info({ messageCount: chat.messages.length }, "Chat found");

    // Parse JSON fields
    const formatted = {
      ...chat,
      toolServerIds: chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [],
      meta: chat.meta ? JSON.parse(chat.meta) : null,
      messages: chat.messages.map((msg) => ({
        ...msg,
        toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : null,
        toolResults: msg.toolResults ? JSON.parse(msg.toolResults) : null,
      })),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error({ err: error }, "Error fetching chat");
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateChatSchema.parse(body);

    // Check if chat exists first
    const existingChat = await db.query.chats.findFirst({
      where: eq(schema.chats.id, id),
    });

    if (!existingChat) {
      logger.error({ id }, "Chat not found for update");
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.systemPrompt !== undefined)
      updateData.systemPrompt = data.systemPrompt;
    if (data.defaultProvider !== undefined)
      updateData.defaultProvider = data.defaultProvider;
    if (data.defaultModelId !== undefined)
      updateData.defaultModelId = data.defaultModelId;
    if (data.toolServerIds !== undefined) {
      updateData.toolServerIds = JSON.stringify(data.toolServerIds);
    }

    const [chat] = await db
      .update(schema.chats)
      .set(updateData)
      .where(eq(schema.chats.id, id))
      .returning();

    return NextResponse.json(chat);
  } catch (error) {
    logger.error({ err: error }, "Error updating chat");
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(schema.chats).where(eq(schema.chats.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error deleting chat");
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
