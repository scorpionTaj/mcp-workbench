import { type NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import logger from "@/lib/logger";
import { withUser } from "@/lib/api";

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (request, user, { params }) => {
  try {
    const { id } = await params;

    const chat = await db.query.chats.findFirst({
      where: and(eq(schema.chats.id, id), eq(schema.chats.userId, user.id)),
      with: {
        messages: {
          orderBy: [schema.messages.createdAt],
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Format export
    const exportData = {
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        systemPrompt: chat.systemPrompt,
        defaultProvider: chat.defaultProvider,
        defaultModelId: chat.defaultModelId,
        toolServerIds: chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [],
      },
      messages: chat.messages.map((msg, index) => ({
        index,
        role: msg.role,
        content: msg.content,
        provider: msg.provider,
        modelId: msg.modelId,
        toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : null,
        toolResults: msg.toolResults ? JSON.parse(msg.toolResults) : null,
        tokensIn: msg.tokensIn,
        tokensOut: msg.tokensOut,
        createdAt: msg.createdAt,
      })),
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="chat-${id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error exporting chat as JSON");
    return NextResponse.json(
      { error: "Failed to export chat" },
      { status: 500 }
    );
  }
});
