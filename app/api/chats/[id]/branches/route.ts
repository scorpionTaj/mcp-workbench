import { NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { buildBranchTree, MAX_BRANCH_NODES, type BranchChat, type BranchMessage } from "@/lib/chat-branches";

type Ctx = { params: Promise<{ id: string }> };

const chatCols = {
  id: schema.chats.id,
  title: schema.chats.title,
  forkedFromId: schema.chats.forkedFromId,
  createdAt: schema.chats.createdAt,
};

const ownChats = (userId: string, ...where: Parameters<typeof and>) =>
  db.select(chatCols).from(schema.chats).where(and(eq(schema.chats.userId, userId), ...where));

/**
 * The branch tree around one of your chats: up through forkedFromId to the root (stopping at a
 * parent that is gone or someone else's, e.g. a fork of a shared chat), then every descendant.
 */
export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const [current] = await ownChats(user.id, eq(schema.chats.id, id)).limit(1);
  if (!current) return notFound();

  const found = new Map<string, BranchChat>([[current.id, current]]);
  let root = current;
  while (root.forkedFromId && found.size < MAX_BRANCH_NODES) {
    const [parent] = await ownChats(user.id, eq(schema.chats.id, root.forkedFromId)).limit(1);
    if (!parent || found.has(parent.id)) break;
    found.set(parent.id, parent);
    root = parent;
  }

  // Breadth-first, one query per level.
  let truncated = false;
  const expanded = new Set<string>();
  let frontier = [root.id];
  while (frontier.length) {
    frontier.forEach((f) => expanded.add(f));
    const kids = await ownChats(user.id, inArray(schema.chats.forkedFromId, frontier))
      .orderBy(asc(schema.chats.createdAt))
      .limit(MAX_BRANCH_NODES + 1);
    frontier = [];
    for (const kid of kids) {
      if (!found.has(kid.id)) {
        if (found.size >= MAX_BRANCH_NODES) {
          truncated = true;
          continue;
        }
        found.set(kid.id, kid);
      }
      if (!expanded.has(kid.id)) frontier.push(kid.id);
    }
  }

  const rows = await db
    .select({
      chatId: schema.messages.chatId,
      id: schema.messages.id,
      role: schema.messages.role,
      createdAt: schema.messages.createdAt,
      preview: sql<string>`left(${schema.messages.content}, 140)`,
    })
    .from(schema.messages)
    .where(inArray(schema.messages.chatId, [...found.keys()]))
    .orderBy(asc(schema.messages.createdAt));
  const messagesByChat = new Map<string, BranchMessage[]>();
  for (const r of rows) {
    const list = messagesByChat.get(r.chatId) ?? [];
    list.push({ id: r.id, role: r.role, createdAt: r.createdAt.getTime(), preview: r.preview ?? "" });
    messagesByChat.set(r.chatId, list);
  }

  return NextResponse.json({
    rootId: root.id,
    currentId: current.id,
    truncated,
    nodes: buildBranchTree(root.id, [...found.values()], messagesByChat),
  });
});
