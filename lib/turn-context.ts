import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ownKnowledgeBaseIds, ownServerIds, ownSkillIds } from "@/lib/agents";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";
import type { MentionType, TurnContext } from "@/lib/composer";

/** The user's own chat folders among `ids`. */
export async function ownFolderIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: schema.chatFolders.id })
    .from(schema.chatFolders)
    .where(and(eq(schema.chatFolders.userId, userId), inArray(schema.chatFolders.id, ids)));
  return rows.map((r) => r.id);
}

const unique = (ids: string[]) => [...new Set(ids)];
const mentioned = (ctx: TurnContext, type: MentionType) => unique(ctx.mentions.filter((m) => m.type === type).map((m) => m.id));

/**
 * Checks every skill and mention against the user's own records. Returns the context reduced to
 * what the user owns, plus a description of each id that isn't theirs (or doesn't exist).
 */
export async function resolveTurnContext(userId: string, ctx: TurnContext) {
  const want = {
    skill: unique(ctx.skillIds),
    folder: mentioned(ctx, "folder"),
    knowledge: mentioned(ctx, "knowledge"),
    mcp: mentioned(ctx, "mcp"),
  };
  const [skill, folder, knowledge, mcp] = await Promise.all([
    ownSkillIds(userId, want.skill),
    ownFolderIds(userId, want.folder),
    ownKnowledgeBaseIds(userId, want.knowledge),
    ownServerIds(userId, want.mcp),
  ]);
  const owned = { skill, folder, knowledge, mcp };
  const rejected = (Object.keys(want) as (keyof typeof want)[]).flatMap((k) =>
    want[k].filter((id) => !owned[k].includes(id)).map((id) => `${k} ${id}`),
  );
  const context: TurnContext = {
    skillIds: skill,
    mentions: ctx.mentions.filter((m) => owned[m.type].includes(m.id)).filter(
      (m, i, all) => all.findIndex((x) => x.type === m.type && x.id === m.id) === i,
    ),
  };
  return { context, rejected };
}

const FOLDER_CHATS = 20;
const SNIPPET = 160;

/** A short, plain-text overview of a folder's chats: title, date, tags and how each one started. */
export async function summarizeFolder(userId: string, folderId: string) {
  const folder = await db.query.chatFolders.findFirst({
    where: and(eq(schema.chatFolders.id, folderId), eq(schema.chatFolders.userId, userId)),
    columns: { name: true },
  });
  if (!folder) return null;
  const chats = await db.query.chats.findMany({
    where: and(eq(schema.chats.userId, userId), eq(schema.chats.folderId, folderId)),
    orderBy: [desc(schema.chats.updatedAt)],
    limit: FOLDER_CHATS,
    columns: { id: true, title: true, updatedAt: true, tags: true },
  });
  const firstAsk = new Map<string, string>();
  if (chats.length) {
    const rows = await db
      .select({ chatId: schema.messages.chatId, parts: schema.messages.parts })
      .from(schema.messages)
      .where(and(inArray(schema.messages.chatId, chats.map((c) => c.id)), eq(schema.messages.role, "user")))
      .orderBy(asc(schema.messages.createdAt))
      .limit(FOLDER_CHATS * 10);
    for (const r of rows) {
      if (firstAsk.has(r.chatId)) continue;
      const text = textOf({ parts: (r.parts ?? []) as ChatUIMessage["parts"] }).replace(/\s+/g, " ").trim();
      if (text) firstAsk.set(r.chatId, text.length > SNIPPET ? `${text.slice(0, SNIPPET)}…` : text);
    }
  }
  const lines = chats.map((c) => {
    const tags = c.tags.length ? ` [${c.tags.map((t) => `#${t}`).join(" ")}]` : "";
    const ask = firstAsk.get(c.id);
    return `- "${c.title || "Untitled"}" (${c.updatedAt.toISOString().slice(0, 10)})${tags}${ask ? `: ${ask}` : ""}`;
  });
  return [`Folder "${folder.name}" (${chats.length ? `${chats.length} most recent chats` : "no chats"}):`, ...lines].join("\n");
}

/** The full text of skills the user picked for this message (enabled ones only). */
async function pinnedSkills(userId: string, ids: string[]) {
  if (!ids.length) return undefined;
  const skills = await db.query.skills.findMany({
    where: and(eq(schema.skills.userId, userId), eq(schema.skills.enabled, true), inArray(schema.skills.id, ids)),
    orderBy: [asc(schema.skills.name)],
  });
  if (!skills.length) return undefined;
  return [
    "The user attached these skills to their latest message. Follow their instructions for this reply (no need to call load_skill for them):",
    ...skills.map((s) => {
      const files = Object.keys(s.resources);
      return [
        `<skill name="${s.name}">`,
        s.instructions.trim(),
        ...(files.length ? [`Supporting files (read with read_skill_file): ${files.join(", ")}`] : []),
        "</skill>",
      ].join("\n");
    }),
  ].join("\n\n");
}

/**
 * Turns a resolved context into what one turn needs: extra system text (picked skills' full
 * instructions and folder summaries) and the skill, knowledge base and MCP server ids to add.
 */
export async function loadTurnContext(userId: string, ctx: TurnContext | undefined) {
  if (!ctx) return { system: undefined, skillIds: [], knowledgeBaseIds: [], serverIds: [] };
  const folders = await Promise.all(mentioned(ctx, "folder").map((id) => summarizeFolder(userId, id)));
  const folderText = folders.filter(Boolean).length
    ? ["The user mentioned these chat folders as context:", ...folders.filter(Boolean)].join("\n\n")
    : undefined;
  return {
    system: [await pinnedSkills(userId, ctx.skillIds), folderText].filter(Boolean).join("\n\n") || undefined,
    skillIds: ctx.skillIds,
    knowledgeBaseIds: mentioned(ctx, "knowledge"),
    serverIds: mentioned(ctx, "mcp"),
  };
}

const RECENT_UPLOADS = 20;

/** Files the user recently attached to their own chat messages, newest first. */
export async function recentUploads(userId: string) {
  const rows = await db
    .select({ parts: schema.messages.parts, createdAt: schema.messages.createdAt })
    .from(schema.messages)
    .innerJoin(schema.chats, eq(schema.chats.id, schema.messages.chatId))
    .where(
      and(
        eq(schema.chats.userId, userId),
        eq(schema.messages.role, "user"),
        sql`${schema.messages.parts}::text like ${'%"/uploads/%'}`,
      ),
    )
    .orderBy(desc(schema.messages.createdAt))
    .limit(60);
  const seen = new Set<string>();
  const out: { url: string; name: string; mediaType: string; createdAt: string }[] = [];
  for (const r of rows) {
    for (const p of (r.parts ?? []) as { type?: string; url?: string; filename?: string; mediaType?: string }[]) {
      if (p.type !== "file" || !p.url?.startsWith("/uploads/") || seen.has(p.url)) continue;
      seen.add(p.url);
      out.push({ url: p.url, name: p.filename || p.url.split("/").pop()!, mediaType: p.mediaType ?? "application/octet-stream", createdAt: r.createdAt.toISOString() });
    }
    if (out.length >= RECENT_UPLOADS) break;
  }
  return out.slice(0, RECENT_UPLOADS);
}
