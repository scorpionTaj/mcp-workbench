import { readFile } from "node:fs/promises";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveUploadUrl } from "@/lib/uploads";
import { canReadUpload } from "@/lib/upload-access";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";

type Row = typeof schema.messages.$inferSelect & {
  attachments?: (typeof schema.attachments.$inferSelect)[];
};

export function rowToUIMessage(row: Row): ChatUIMessage {
  const meta = (row.metadata ?? {}) as ChatUIMessage["metadata"];
  const parts =
    (row.parts as ChatUIMessage["parts"] | null) ?? [
      // Rows written before parts existed.
      ...(row.reasoning ? [{ type: "reasoning" as const, text: row.reasoning }] : []),
      ...(row.attachments ?? []).map((a) => ({
        type: "file" as const,
        mediaType: a.mime,
        filename: a.name,
        url: a.url,
      })),
      { type: "text" as const, text: row.content },
    ];
  return {
    id: row.id,
    role: row.role === "assistant" || row.role === "system" ? row.role : "user",
    parts,
    metadata: {
      ...meta,
      provider: row.provider ?? meta?.provider,
      modelId: row.modelId ?? meta?.modelId,
      inputTokens: row.tokensIn ?? meta?.inputTokens,
      outputTokens: row.tokensOut ?? meta?.outputTokens,
      createdAt: row.createdAt.getTime(),
    },
  };
}

export async function loadChatMessages(chatId: string): Promise<ChatUIMessage[]> {
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.chatId, chatId),
    orderBy: [asc(schema.messages.createdAt)],
    with: { attachments: true },
  });
  return rows.map(rowToUIMessage);
}

export async function saveMessages(chatId: string, messages: ChatUIMessage[]) {
  if (!messages.length) return;
  // Replace this chat's copies (continuations re-save the same assistant message id).
  await db.delete(schema.messages).where(
    and(eq(schema.messages.chatId, chatId), inArray(schema.messages.id, messages.map((m) => m.id))),
  );
  await db
    .insert(schema.messages)
    .values(
      messages.map((m) => ({
        id: m.id,
        chatId,
        role: m.role,
        content: textOf(m),
        parts: m.parts,
        metadata: m.metadata ?? null,
        provider: m.metadata?.provider,
        modelId: m.metadata?.modelId,
        tokensIn: m.metadata?.inputTokens,
        tokensOut: m.metadata?.outputTokens,
        createdAt: m.metadata?.createdAt ? new Date(m.metadata.createdAt) : new Date(),
      })),
    )
    // A message id that already exists (resend, or another chat's id) is never overwritten.
    .onConflictDoNothing();
}

/**
 * Models can't fetch our relative /uploads URLs, so file parts are inlined as data URLs
 * for the model call only (the stored message keeps the short URL).
 */
export async function inlineUploads(messages: ChatUIMessage[], userId: string): Promise<ChatUIMessage[]> {
  return Promise.all(
    messages.map(async (m) => ({
      ...m,
      parts: await Promise.all(
        m.parts.map(async (p) => {
          if (p.type !== "file" || !p.url.startsWith("/uploads/")) return p;
          // A message could name another user's file; only the sender's own uploads are read.
          if (!(await canReadUpload(userId, p.url))) throw new Error(`Attachment not found: ${p.url}`);
          const data = await readFile(resolveUploadUrl(p.url));
          return { ...p, url: `data:${p.mediaType};base64,${data.toString("base64")}` };
        }),
      ),
    })),
  );
}

/** Regenerate/edit: drop a message and everything after it so the conversation continues from there. */
export async function truncateFrom(chatId: string, history: ChatUIMessage[], messageId: string) {
  const idx = history.findIndex((m) => m.id === messageId);
  if (idx < 0) return history;
  const ids = history.slice(idx).map((m) => m.id);
  await db
    .delete(schema.messages)
    .where(and(eq(schema.messages.chatId, chatId), inArray(schema.messages.id, ids)));
  return history.slice(0, idx);
}

/**
 * Approval round-trip: the client resends the assistant message with approve/deny decisions.
 * Only the decisions are taken from the client; everything else comes from the stored message.
 */
export function applyApprovalResponses(stored: ChatUIMessage, incoming: ChatUIMessage): ChatUIMessage {
  const decisions = new Map<string, { approved: boolean; reason?: string }>();
  for (const p of incoming.parts) {
    if ("state" in p && p.state === "approval-responded" && "approval" in p && p.approval) {
      decisions.set(p.approval.id, { approved: !!p.approval.approved, reason: p.approval.reason });
    }
  }
  return {
    ...stored,
    parts: stored.parts.map((p) => {
      if (!("state" in p) || p.state !== "approval-requested" || !("approval" in p) || !p.approval) return p;
      const d = decisions.get(p.approval.id);
      return d
        ? ({ ...p, state: "approval-responded", approval: { ...p.approval, ...d } } as unknown as typeof p)
        : p;
    }),
  };
}
