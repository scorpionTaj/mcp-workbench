import { createHash } from "node:crypto";
import { convertToModelMessages, isStepCount, streamText, toUIMessageStream, type ToolSet } from "ai";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getModel, getModelPrice, ProviderError } from "@/lib/models";
import { costUsd } from "@/lib/pricing";
import { saveMessages, inlineUploads } from "@/lib/chat-store";
import { loadChatTools } from "@/lib/mcp";
import { visibleAgent, composeSystemPrompt } from "@/lib/agents";
import { loadChatSkills } from "@/lib/skills";
import { loadChatKnowledge } from "@/lib/knowledge";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";
import { loadTurnContext } from "@/lib/turn-context";
import type { TurnContext } from "@/lib/composer";
import logger from "@/lib/logger";

const MAX_STEPS = 8;

// Signs tool-approval requests so a modified client can't forge an approval.
const toolApprovalSecret = () =>
  createHash("sha256")
    .update(`tool-approval:${process.env.TOOL_APPROVAL_SECRET ?? process.env.BETTER_AUTH_SECRET ?? ""}`)
    .digest();

/** A request problem the caller should report as a 400. */
export class TurnError extends Error {
  constructor(message: string, readonly details?: string) {
    super(message);
  }
}

export interface TurnSettings {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Runs one assistant turn for a chat and returns its UI message stream. When the stream ends,
 * `save` plus the reply are stored and the chat's model (and a missing title) are updated.
 *
 * `unattended` turns (scheduled runs) have nobody to approve tool calls, so only MCP tools that
 * never ask for approval are offered; the model is told which ones were left out.
 */
export async function startChatTurn({
  userId,
  chat,
  messages,
  save,
  provider,
  modelId,
  settings,
  unattended = false,
  context,
  onReady,
}: {
  userId: string;
  chat: typeof schema.chats.$inferSelect;
  messages: ChatUIMessage[];
  save: ChatUIMessage[];
  provider: string;
  modelId: string;
  settings?: TurnSettings;
  unattended?: boolean;
  /** Skills and mentions picked for this message only; must already be ownership-checked (resolveTurnContext). */
  context?: TurnContext;
  /** Runs once the request is known to be valid, before generation starts (e.g. truncating history). */
  onReady?: () => Promise<unknown>;
}) {
  let model;
  const price = getModelPrice(userId, provider, modelId).catch((err) => {
    logger.warn({ err, provider, modelId }, "Could not load model price");
    return null;
  });
  try {
    model = await getModel(userId, provider, modelId);
  } catch (err) {
    if (err instanceof ProviderError) throw new TurnError(err.message);
    throw err;
  }
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(await inlineUploads(messages, userId));
  } catch (err) {
    throw new TurnError("Could not read an attached file", String(err));
  }
  await onReady?.();

  // A linked agent contributes its instructions, MCP servers, step budget and default temperature.
  const agent = chat.agentId ? await visibleAgent(userId, chat.agentId) : undefined;
  // Composer picks add to the chat's own setup for this turn only.
  const turn = await loadTurnContext(userId, context);
  const chatServerIds: string[] = chat.toolServerIds ? JSON.parse(chat.toolServerIds) : [];
  const mcp = await loadChatTools(userId, [
    ...new Set([...chatServerIds, ...(agent?.toolServerIds ?? []), ...turn.serverIds]),
  ]);
  // An agent limited to some skills still gets the ones picked for this message.
  const skills = await loadChatSkills(userId, agent?.skillIds?.length ? [...agent.skillIds, ...turn.skillIds] : []);
  // Only the chat owner's own knowledge bases are searched (a shared agent's are its author's).
  const knowledge = await loadChatKnowledge(userId, [
    ...new Set([
      ...chat.knowledgeBaseIds,
      ...(agent?.userId === userId ? agent.knowledgeBaseIds : []),
      ...turn.knowledgeBaseIds,
    ]),
  ]);

  let mcpTools = mcp.tools;
  let unattendedNote: string | undefined;
  if (unattended) {
    const held = Object.keys(mcp.tools).filter((k) => mcp.toolApproval[k] !== "not-applicable");
    mcpTools = Object.fromEntries(Object.entries(mcp.tools).filter(([k]) => !held.includes(k)));
    if (held.length) {
      unattendedNote = `This is a scheduled run with nobody to approve tool calls, so these tools are unavailable: ${held.join(", ")}. Say so if the task needs them.`;
    }
  }

  const result = streamText({
    model,
    system:
      [
        composeSystemPrompt(agent?.systemPrompt, chat.systemPrompt),
        knowledge.system,
        skills.system,
        turn.system,
        unattendedNote,
      ]
        .filter(Boolean)
        .join("\n\n") || undefined,
    ...(agent?.temperature != null && { temperature: agent.temperature }),
    messages: modelMessages,
    tools: { ...skills.tools, ...knowledge.tools, ...mcpTools },
    toolApproval: mcp.toolApproval,
    experimental_toolApprovalSecret: toolApprovalSecret(),
    stopWhen: isStepCount(agent?.maxSteps ?? MAX_STEPS),
    ...settings,
  });
  // Keep generating (and saving) even if the browser disconnects mid-stream.
  result.consumeStream();

  const turnMessage = save[save.length - 1];
  const turnPrice = await price;
  return toUIMessageStream<ToolSet, ChatUIMessage>({
    stream: result.stream,
    originalMessages: messages,
    generateMessageId: createId,
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return {
          provider,
          modelId,
          createdAt: Date.now(),
          ...(mcp.errors.length ? { mcpErrors: mcp.errors } : {}),
        };
      }
      if (part.type === "finish") {
        return {
          inputTokens: part.totalUsage.inputTokens,
          outputTokens: part.totalUsage.outputTokens,
          costUsd: costUsd(turnPrice, part.totalUsage.inputTokens, part.totalUsage.outputTokens),
        };
      }
    },
    onError: (err) => {
      logger.error({ err, provider }, "Chat stream failed");
      return err instanceof Error ? err.message : "The model request failed";
    },
    onEnd: async ({ responseMessage }) => {
      await mcp.close();
      try {
        await saveMessages(chat.id, [...save, responseMessage]);
        await db
          .update(schema.chats)
          .set({
            updatedAt: new Date(),
            defaultProvider: provider,
            defaultModelId: modelId,
            ...(!chat.title && turnMessage && { title: textOf(turnMessage).slice(0, 60) || "New Chat" }),
          })
          .where(eq(schema.chats.id, chat.id));
      } catch (err) {
        logger.error({ err, chatId: chat.id }, "Failed to save chat messages");
      }
    },
  });
}
