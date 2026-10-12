import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@/lib/db";
import { loadChatMessages, saveMessages } from "@/lib/chat-store";
import type { ChatUIMessage } from "@/lib/chat-messages";

type Chat = typeof schema.chats.$inferSelect;

/** 144 random bits, URL-safe: the link itself is the only credential for a shared chat. */
export const newShareId = () => randomBytes(18).toString("base64url");

export async function sharedChat(shareId: string) {
  if (!/^[\w-]{20,40}$/.test(shareId)) return undefined;
  return db.query.chats.findFirst({ where: eq(schema.chats.shareId, shareId) });
}

/**
 * What a shared link exposes: the conversation, nothing private. Uploaded files are served only
 * to their owner, so file parts become a note naming the file; token counts and MCP error
 * details are dropped.
 */
export function publicMessages(messages: ChatUIMessage[]): ChatUIMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.type === "file" && !p.url.startsWith("data:")
          ? { type: "text" as const, text: `\n\n_📎 ${p.filename ?? "attachment"} (not included in shared chats)_\n\n` }
          : p,
      ),
      metadata: { provider: m.metadata?.provider, modelId: m.metadata?.modelId, createdAt: m.metadata?.createdAt },
    }));
}

/**
 * Branch a conversation into a new chat owned by `userId`, keeping messages up to and including
 * `uptoMessageId` (all of them when omitted). Messages get fresh ids, so the copies are
 * independent. A fork of someone else's shared chat keeps only the conversation and model;
 * their system prompt, tools, knowledge bases and agent stay theirs.
 */
export async function forkChat(
  userId: string,
  source: Chat,
  { uptoMessageId, fromShare }: { uptoMessageId?: string; fromShare: boolean },
) {
  let messages = await loadChatMessages(source.id);
  if (fromShare) messages = publicMessages(messages);
  if (uptoMessageId) {
    const idx = messages.findIndex((m) => m.id === uptoMessageId);
    if (idx < 0) return null;
    messages = messages.slice(0, idx + 1);
  }

  const [chat] = await db
    .insert(schema.chats)
    .values({
      userId,
      title: `${source.title ?? "Untitled chat"} (branch)`.slice(0, 200),
      defaultProvider: source.defaultProvider,
      defaultModelId: source.defaultModelId,
      forkedFromId: source.id,
      ...(!fromShare && {
        systemPrompt: source.systemPrompt,
        toolServerIds: source.toolServerIds,
        knowledgeBaseIds: source.knowledgeBaseIds,
        agentId: source.agentId,
        meta: source.meta,
      }),
    })
    .returning();

  // Copies keep their original timestamps (the sort key), so the order is unchanged.
  await saveMessages(chat.id, messages.map((m) => ({ ...m, id: createId() })));
  return chat;
}
