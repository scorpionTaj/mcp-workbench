import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
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
    console.error("MCP Workbench Error exporting chat as CSV:", error);
    return NextResponse.json(
      { error: "Failed to export chat" },
      { status: 500 }
    );
  }
}
