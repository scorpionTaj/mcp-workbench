import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool", "system"]),
  content: z.string(),
  reasoning: z.string().optional(),
  provider: z.enum(["ollama", "lmstudio"]).optional(),
  modelId: z.string().optional(),
  toolCalls: z.array(z.any()).optional(),
  toolResults: z.array(z.any()).optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const body = await request.json();

    console.log("MCP Workbench Messages API - POST called:", {
      chatId,
      role: body.role,
      contentLength: body.content?.length,
    });

    const data = createMessageSchema.parse(body);

    // Verify chat exists
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      console.error("MCP Workbench Messages API - Chat not found:", chatId);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    console.log("MCP Workbench Messages API - Creating message in database...");

    // Create message
    const message = await prisma.message.create({
      data: {
        chatId,
        role: data.role,
        content: data.content,
        reasoning: data.reasoning,
        provider: data.provider,
        modelId: data.modelId,
        toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
        toolResults: data.toolResults ? JSON.stringify(data.toolResults) : null,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      },
    });

    console.log("MCP Workbench Messages API - Message created:", message.id);

    // Update chat's updatedAt and auto-generate title if needed
    if (!chat.title && data.role === "user") {
      const title =
        data.content.slice(0, 50) + (data.content.length > 50 ? "..." : "");
      await prisma.chat.update({
        where: { id: chatId },
        data: { title, updatedAt: new Date() },
      });
      console.log("MCP Workbench Messages API - Chat title updated:", title);
    } else {
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("MCP Workbench Error creating message:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
