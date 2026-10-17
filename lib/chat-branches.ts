// Branch trees: chats linked by Chat.forkedFromId. Shared by the API and the chat page; no DB imports.

/** Most chats one tree request loads (ancestors and descendants together). */
export const MAX_BRANCH_NODES = 200;

export interface BranchChat {
  id: string;
  title: string | null;
  forkedFromId: string | null;
  createdAt: Date;
}

export interface BranchMessage {
  id: string;
  role: string;
  /** Epoch ms. A fork copies messages with fresh ids but their original timestamps. */
  createdAt: number;
  preview: string;
}

export interface BranchNode {
  id: string;
  title: string | null;
  parentId: string | null;
  createdAt: string;
  depth: number;
  messageCount: number;
  /** The last message this chat still shares with its parent: where the branch starts. */
  divergedAt: { index: number; messageId: string; role: string; preview: string } | null;
}

/**
 * How many leading messages two chats have in common. Copies are matched by role and
 * timestamp, since a fork gives every copied message a new id.
 */
export function sharedPrefixLength(
  a: readonly Pick<BranchMessage, "role" | "createdAt">[],
  b: readonly Pick<BranchMessage, "role" | "createdAt">[],
): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i].role === b[i].role && a[i].createdAt === b[i].createdAt) i++;
  return i;
}

/**
 * Lays out the tree under `rootId` depth-first, children oldest first, so an indented list
 * reads top to bottom. Chats not reachable from the root are left out; a cycle can't loop.
 */
export function buildBranchTree(
  rootId: string,
  chats: readonly BranchChat[],
  messagesByChat: ReadonlyMap<string, readonly BranchMessage[]>,
): BranchNode[] {
  const byId = new Map(chats.map((c) => [c.id, c]));
  const children = new Map<string, BranchChat[]>();
  for (const c of chats) {
    if (!c.forkedFromId || c.id === rootId) continue;
    const list = children.get(c.forkedFromId) ?? [];
    list.push(c);
    children.set(c.forkedFromId, list);
  }
  for (const list of children.values()) list.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());

  const root = byId.get(rootId);
  if (!root) return [];
  const nodes: BranchNode[] = [];
  const seen = new Set<string>();
  // Explicit stack instead of recursion: deep chains of branches stay cheap.
  const stack: { chat: BranchChat; depth: number; parentId: string | null }[] = [{ chat: root, depth: 0, parentId: null }];
  while (stack.length) {
    const { chat, depth, parentId } = stack.pop()!;
    if (seen.has(chat.id)) continue;
    seen.add(chat.id);
    const own = messagesByChat.get(chat.id) ?? [];
    const shared = parentId ? sharedPrefixLength(messagesByChat.get(parentId) ?? [], own) : 0;
    const last = shared > 0 ? own[shared - 1] : undefined;
    nodes.push({
      id: chat.id,
      title: chat.title,
      parentId,
      createdAt: chat.createdAt.toISOString(),
      depth,
      messageCount: own.length,
      divergedAt: last ? { index: shared - 1, messageId: last.id, role: last.role, preview: last.preview } : null,
    });
    const kids = children.get(chat.id) ?? [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ chat: kids[i], depth: depth + 1, parentId: chat.id });
  }
  return nodes;
}
