import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateChatSchema = z.object({
  title: z.string().optional(),
  systemPrompt: z.string().optional(),
  defaultProvider: z.enum(["ollama", "lmstudio"]).optional(),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log("MCP Workbench Fetching chat details:", id);

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!chat) {
      console.error("MCP Workbench Chat not found:", id);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    console.log(
      "MCP Workbench Chat found with",
      chat.messages.length,
      "messages"
    );

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
    console.error("MCP Workbench Error fetching chat:", error);
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

    const chat = await prisma.chat.update({
      where: { id },
      data: {
        title: data.title,
        systemPrompt: data.systemPrompt,
        defaultProvider: data.defaultProvider,
        defaultModelId: data.defaultModelId,
        toolServerIds: data.toolServerIds
          ? JSON.stringify(data.toolServerIds)
          : undefined,
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("MCP Workbench Error updating chat:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
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

    await prisma.chat.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MCP Workbench Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
