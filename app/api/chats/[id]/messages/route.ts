import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import logger from "@/lib/logger";

const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool", "system"]),
  content: z.string(),
  reasoning: z.string().optional(),
  provider: z
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
  modelId: z.string().optional(),
  toolCalls: z.array(z.any()).optional(),
  toolResults: z.array(z.any()).optional(),
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const body = await request.json();

    logger.info(
      {
        chatId,
        role: body.role,
        contentLength: body.content?.length,
      },
      "Messages API - POST called"
    );

    const data = createMessageSchema.parse(body);

    // Verify chat exists
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      logger.error({ chatId }, "Messages API - Chat not found");
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    logger.info("Messages API - Creating message in database");

    // Create message with attachments
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
        attachments: data.attachments
          ? {
              create: data.attachments.map((att) => ({
                name: att.name,
                mime: att.type,
                size: att.size,
                url: att.url,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
      },
    });

    logger.info(
      {
        messageId: message.id,
        attachmentCount: data.attachments?.length || 0,
      },
      "Messages API - Message created"
    );

    // Update chat's updatedAt and auto-generate title if needed
    if (!chat.title && data.role === "user") {
      const title =
        data.content.slice(0, 50) + (data.content.length > 50 ? "..." : "");
      await prisma.chat.update({
        where: { id: chatId },
        data: { title, updatedAt: new Date() },
      });
      logger.info({ title }, "Messages API - Chat title updated");
    } else {
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(message);
  } catch (error) {
    logger.error({ err: error }, "Error creating message");
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
