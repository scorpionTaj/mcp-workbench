import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
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
import {
  loadChatMessages,
  saveMessages,
  inlineUploads,
  truncateFrom,
  applyApprovalResponses,
} from "@/lib/chat-store";
import { loadChatTools } from "@/lib/mcp";
import { visibleAgent, composeSystemPrompt } from "@/lib/agents";
import { loadChatSkills } from "@/lib/skills";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";
import logger from "@/lib/logger";

export const maxDuration = 300;
const MAX_STEPS = 8;

// Signs tool-approval requests so a modified client can't forge an approval.
const toolApprovalSecret = () =>
  createHash("sha256")
    .update(`tool-approval:${process.env.TOOL_APPROVAL_SECRET ?? process.env.BETTER_AUTH_SECRET ?? ""}`)
    .digest();

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
  const turnMessage = messages[messages.length - 1];

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

  // A linked agent contributes its instructions, MCP servers, step budget and default temperature.
  const agent = chat.agentId ? await visibleAgent(user.id, chat.agentId) : undefined;
  const chatServerIds: string[] = chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [];
  const mcp = await loadChatTools(user.id, [...new Set([...chatServerIds, ...(agent?.toolServerIds ?? [])])]);
  const skills = await loadChatSkills(user.id, agent?.skillIds);
  const result = streamText({
    model,
    system: [composeSystemPrompt(agent?.systemPrompt, chat.systemPrompt), skills.system].filter(Boolean).join("\n\n") || undefined,
    ...(agent?.temperature != null && { temperature: agent.temperature }),
    messages: modelMessages,
    tools: { ...skills.tools, ...mcp.tools },
    toolApproval: mcp.toolApproval,
    experimental_toolApprovalSecret: toolApprovalSecret(),
    stopWhen: isStepCount(agent?.maxSteps ?? MAX_STEPS),
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
          return {
            provider: data.provider,
            modelId: data.modelId,
            createdAt: Date.now(),
            ...(mcp.errors.length ? { mcpErrors: mcp.errors } : {}),
          };
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
        await mcp.close();
        try {
          await saveMessages(chat.id, isApproval ? [responseMessage] : [turnMessage, responseMessage]);
          await db
            .update(schema.chats)
            .set({
              updatedAt: new Date(),
              defaultProvider: data.provider,
              defaultModelId: data.modelId,
              ...(!chat.title && { title: textOf(turnMessage).slice(0, 60) || "New Chat" }),
            })
            .where(eq(schema.chats.id, chat.id));
        } catch (err) {
          logger.error({ err, chatId: chat.id }, "Failed to save chat messages");
        }
      },
    }),
  });
});
