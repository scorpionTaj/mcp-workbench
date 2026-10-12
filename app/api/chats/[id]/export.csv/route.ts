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

    // Build CSV
    const headers = [
      "chat_id",
      "msg_index",
      "role",
      "provider",
      "model_id",
      "content",
      "tool_calls_json",
      "tool_results_json",
      "tokens_in",
      "tokens_out",
      "created_at",
    ];

    const rows = chat.messages.map((msg, index) => [
      chat.id,
      index.toString(),
      msg.role,
      msg.provider || "",
      msg.modelId || "",
      `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
      msg.toolCalls ? `"${msg.toolCalls.replace(/"/g, '""')}"` : "",
      msg.toolResults ? `"${msg.toolResults.replace(/"/g, '""')}"` : "",
      msg.tokensIn?.toString() || "",
      msg.tokensOut?.toString() || "",
      msg.createdAt.toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="chat-${id}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error exporting chat as CSV");
    return NextResponse.json(
      { error: "Failed to export chat" },
      { status: 500 }
    );
  }
});
