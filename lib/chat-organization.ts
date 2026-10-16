import { z } from "zod";

export const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 32;

/** Lowercases, trims, collapses spaces to "-", drops empties and duplicates, keeps the first MAX_TAGS. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, MAX_TAG_LENGTH);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

/** Parses "a, b #c" style input into tags. */
export const parseTagInput = (input: string) => normalizeTags(input.split(/[,\s]+/));

export const folderNameSchema = z.string().trim().min(1).max(60);

/** Fields of PATCH /api/chats/[id] that organize a chat without changing its content. */
export const chatOrganizationSchema = z.object({
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  folderId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().max(100)).max(50).transform(normalizeTags).optional(),
});

export type ChatFilter =
  | { kind: "all" }
  | { kind: "unfiled" }
  | { kind: "folder"; id: string }
  | { kind: "tag"; tag: string };

interface Organizable {
  pinned: boolean;
  folderId: string | null;
  tags: string[];
}

export function matchesFilter(chat: Organizable, filter: ChatFilter): boolean {
  switch (filter.kind) {
    case "all":
      return true;
    case "unfiled":
      return chat.folderId === null;
    case "folder":
      return chat.folderId === filter.id;
    case "tag":
      return chat.tags.includes(filter.tag);
  }
}

/** Every tag used across the chats, most used first. */
export function tagCounts(chats: Organizable[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of chats) for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Escapes LIKE wildcards so user text matches literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
