import { NextResponse } from "next/server";
import { createUIMessageStreamResponse, validateUIMessages } from "ai";
import { z } from "zod";
import { ownedChat } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { loadChatMessages, truncateFrom, applyApprovalResponses } from "@/lib/chat-store";
import { startChatTurn, TurnError } from "@/lib/chat-turn";
import type { ChatUIMessage } from "@/lib/chat-messages";
import { chatSettingsSchema } from "@/lib/chat-settings";
import { isEmptyContext, turnContextSchema, type TurnContext } from "@/lib/composer";
import { resolveTurnContext } from "@/lib/turn-context";

export const maxDuration = 300;

const bodySchema = z.object({
  id: z.string().min(1), // chat id
  message: z
    .object({ id: z.string().min(1).max(64), role: z.enum(["user", "assistant"]) })
    .passthrough(),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  settings: chatSettingsSchema.optional(),
  // Skills and "@" mentions picked in the composer for this message.
  context: turnContextSchema.optional(),
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

  // Every picked id must be the user's own. An approval round-trip or a regenerate/edit without
  // new picks reuses what the original message had (dropping anything deleted since).
  // The client also keeps the picks on its copy of the message, so a retry after an error resends them.
  const echoed = turnContextSchema.safeParse((data.message.metadata as { context?: unknown } | undefined)?.context);
  const sent = !isEmptyContext(data.context) ? data.context : echoed.success ? echoed.data : undefined;
  let context: TurnContext | undefined;
  if (!isEmptyContext(sent)) {
    const resolved = await resolveTurnContext(user.id, sent!);
    if (resolved.rejected.length) {
      return NextResponse.json({ error: "Unknown skill or mention", details: resolved.rejected }, { status: 400 });
    }
    context = resolved.context;
  } else {
    const original = isApproval ? kept.findLast((m) => m.role === "user") : history[resendAt];
    const stored = original?.metadata?.context;
    if (!isEmptyContext(stored)) context = (await resolveTurnContext(user.id, stored!)).context;
  }

  let messages: ChatUIMessage[];
  try {
    const [incoming] = await validateUIMessages<ChatUIMessage>({ messages: [data.message] });
    messages = isApproval
      ? [...kept.slice(0, -1), applyApprovalResponses(last, incoming)]
      : await validateUIMessages<ChatUIMessage>({
          messages: [
            ...kept,
            { ...incoming, metadata: { createdAt: Date.now(), ...(!isEmptyContext(context) && { context }) } },
          ],
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
      context,
      onReady: () => (resendAt >= 0 ? truncateFrom(chat.id, history, data.message.id) : Promise.resolve()),
    });
    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    if (err instanceof TurnError) return NextResponse.json({ error: err.message, details: err.details }, { status: 400 });
    throw err;
  }
}, { rateLimit: "chat" });
