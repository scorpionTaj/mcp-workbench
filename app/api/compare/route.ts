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
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getModel, ProviderError } from "@/lib/models";
import type { ChatUIMessage } from "@/lib/chat-messages";
import logger from "@/lib/logger";

export const maxDuration = 300;

const bodySchema = z.object({
  provider: z.string().min(1).max(50),
  modelId: z.string().min(1).max(200),
  system: z.string().max(20_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  // The whole (short, unsaved) comparison thread comes from the client.
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]) }).passthrough()).min(1).max(40),
});

/**
 * Stateless chat for the Compare page: nothing is stored and no tools run, so the same thread can
 * be sent to several models. Reports token usage and total time in the message metadata.
 */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;
  let messages: ChatUIMessage[];
  try {
    messages = await validateUIMessages<ChatUIMessage>({ messages: data.messages });
    // Text only: files and tool parts belong in a real chat.
    messages = messages.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type === "text") }));
  } catch (err) {
    return NextResponse.json({ error: "Invalid messages", details: String(err) }, { status: 400 });
  }
  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user" }, { status: 400 });
  }
  let model;
  try {
    model = await getModel(user.id, data.provider, data.modelId);
  } catch (err) {
    if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const started = Date.now();
  const result = streamText({
    model,
    system: data.system || undefined,
    messages: await convertToModelMessages(messages),
    ...(data.temperature !== undefined && { temperature: data.temperature }),
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream<ToolSet, ChatUIMessage>({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createId,
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { provider: data.provider, modelId: data.modelId, createdAt: started };
        if (part.type === "finish") {
          return { inputTokens: part.totalUsage.inputTokens, outputTokens: part.totalUsage.outputTokens, durationMs: Date.now() - started };
        }
      },
      onError: (err) => {
        logger.error({ err, provider: data.provider }, "Compare stream failed");
        return err instanceof Error ? err.message : "The model request failed";
      },
    }),
  });
}, { rateLimit: "compare" });
