import { NextResponse } from "next/server";
import { createUIMessageStreamResponse, validateUIMessages } from "ai";
import { z } from "zod";
import { ownedChat } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { loadChatMessages, truncateFrom, applyApprovalResponses } from "@/lib/chat-store";
import { startChatTurn, TurnError } from "@/lib/chat-turn";
import type { ChatUIMessage } from "@/lib/chat-messages";

export const maxDuration = 300;

const bodySchema = z.object({
  id: z.string().min(1), // chat id
  message: z
    .object({ id: z.string().min(1).max(64), role: z.enum(["user", "assistant"]) })
    .passthrough(),
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

  const history = await loadChatMessages(chat.id);
  const last = history[history.length - 1];
  // An assistant message is only accepted as the approval round-trip for the latest stored reply.
  const isApproval = data.message.role === "assistant";
  if (isApproval && last?.id !== data.message.id) {
    return NextResponse.json({ error: "Only the latest reply can be continued" }, { status: 400 });
  }
  // Resending a stored user message (regenerate/edit) continues the chat from that point.
  const resendAt = isApproval ? -1 : history.findIndex((m) => m.id === data.message.id);
  const kept = resendAt < 0 ? history : history.slice(0, resendAt);

  let messages: ChatUIMessage[];
  try {
    const [incoming] = await validateUIMessages<ChatUIMessage>({ messages: [data.message] });
    messages = isApproval
      ? [...kept.slice(0, -1), applyApprovalResponses(last, incoming)]
      : await validateUIMessages<ChatUIMessage>({
          messages: [...kept, { ...incoming, metadata: { createdAt: Date.now() } }],
        });
  } catch (err) {
    return NextResponse.json({ error: "Invalid message", details: String(err) }, { status: 400 });
  }
  try {
    const stream = await startChatTurn({
      userId: user.id,
      chat,
      messages,
      save: isApproval ? [] : [messages[messages.length - 1]],
      provider: data.provider,
      modelId: data.modelId,
      settings: data.settings,
      onReady: () => (resendAt >= 0 ? truncateFrom(chat.id, history, data.message.id) : Promise.resolve()),
    });
    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    if (err instanceof TurnError) return NextResponse.json({ error: err.message, details: err.details }, { status: 400 });
    throw err;
  }
}, { rateLimit: "chat" });
