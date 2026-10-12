import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type ToolSet,
} from "ai";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema, ownedChat } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { getModel, ProviderError } from "@/lib/models";
import { loadChatMessages, saveMessages, inlineUploads, truncateFrom } from "@/lib/chat-store";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";
import logger from "@/lib/logger";

export const maxDuration = 300;

const bodySchema = z.object({
  id: z.string().min(1), // chat id
  message: z.object({ id: z.string().min(1).max(64), role: z.literal("user") }).passthrough(),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  settings: z
    .object({
      temperature: z.number().min(0).max(2),
      topP: z.number().min(0).max(1),
      maxOutputTokens: z.number().int().positive().max(1_000_000),
      frequencyPenalty: z.number().min(-2).max(2),
      presencePenalty: z.number().min(-2).max(2),
    })
    .partial()
    .optional(),
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;
  const chat = await ownedChat(user.id, data.id);
  if (!chat) return notFound();

  // Resending a stored message (regenerate/edit) continues the chat from that point.
  const history = await loadChatMessages(chat.id);
  const resendAt = history.findIndex((m) => m.id === data.message.id);
  const kept = resendAt < 0 ? history : history.slice(0, resendAt);

  let messages: ChatUIMessage[];
  try {
    const incoming = { ...data.message, metadata: { createdAt: Date.now() } };
    messages = await validateUIMessages<ChatUIMessage>({ messages: [...kept, incoming] });
  } catch (err) {
    return NextResponse.json({ error: "Invalid message", details: String(err) }, { status: 400 });
  }
  const userMessage = messages[messages.length - 1];

  let model;
  try {
    model = await getModel(user.id, data.provider, data.modelId);
  } catch (err) {
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(await inlineUploads(messages));
  } catch (err) {
    return NextResponse.json({ error: "Could not read an attached file", details: String(err) }, { status: 400 });
  }
  if (resendAt >= 0) await truncateFrom(chat.id, history, data.message.id);

  const result = streamText({
    model,
    system: chat.systemPrompt || undefined,
    messages: modelMessages,
    ...data.settings,
  });
  // Keep generating (and saving) even if the browser disconnects mid-stream.
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream<ToolSet, ChatUIMessage>({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createId,
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return { provider: data.provider, modelId: data.modelId, createdAt: Date.now() };
        }
        if (part.type === "finish") {
          return {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
          };
        }
      },
      onError: (err) => {
        logger.error({ err, provider: data.provider }, "Chat stream failed");
        return err instanceof Error ? err.message : "The model request failed";
      },
      onEnd: async ({ responseMessage }) => {
        try {
          await saveMessages(chat.id, [userMessage, responseMessage]);
          await db
            .update(schema.chats)
            .set({
              updatedAt: new Date(),
              defaultProvider: data.provider,
              defaultModelId: data.modelId,
              ...(!chat.title && { title: textOf(userMessage).slice(0, 60) || "New Chat" }),
            })
            .where(eq(schema.chats.id, chat.id));
        } catch (err) {
          logger.error({ err, chatId: chat.id }, "Failed to save chat messages");
        }
      },
    }),
  });
});
