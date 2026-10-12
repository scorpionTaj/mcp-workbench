// Shared (client + server) chat message shapes and conversions. No DB imports here.
import {
  getToolName,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";

export type ChatMetadata = {
  provider?: string;
  modelId?: string;
  createdAt?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type ChatUIMessage = UIMessage<ChatMetadata>;

/** Shape rendered by the chat components (ChatMessages / ChatInspector). */
export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  reasoning?: string | null;
  provider?: string | null;
  modelId?: string | null;
  toolCalls?: { toolName: string; input?: unknown; output?: unknown; error?: string; state: string }[] | null;
  toolResults?: unknown[] | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  createdAt: string;
  attachments?: Attachment[];
}

export function textOf(message: Pick<UIMessage, "parts">): string {
  return message.parts.filter(isTextUIPart).map((p) => p.text).join("");
}

export function toDisplayMessage(m: ChatUIMessage, chatId: string): Message {
  const createdAt = new Date(m.metadata?.createdAt ?? Date.now()).toISOString();
  const reasoning = m.parts.filter(isReasoningUIPart).map((p) => p.text).join("\n");
  const tools = m.parts.filter(isToolUIPart).map((p) => ({
    toolName: getToolName(p),
    state: p.state,
    input: "input" in p ? p.input : undefined,
    output: "output" in p ? p.output : undefined,
    error: "errorText" in p ? p.errorText : undefined,
  }));
  return {
    id: m.id,
    chatId,
    role: m.role,
    content: textOf(m),
    reasoning: reasoning || null,
    provider: m.metadata?.provider ?? null,
    modelId: m.metadata?.modelId ?? null,
    toolCalls: tools.length ? tools : null,
    tokensIn: m.metadata?.inputTokens ?? null,
    tokensOut: m.metadata?.outputTokens ?? null,
    createdAt,
    attachments: m.parts.filter(isFileUIPart).map((p, i) => ({
      id: `${m.id}-${i}`,
      name: p.filename ?? "file",
      mime: p.mediaType,
      size: 0,
      url: p.url,
      createdAt,
    })),
  };
}
