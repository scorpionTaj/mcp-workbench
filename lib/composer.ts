// Shared (client + server) pieces of the chat composer's "/" and "@" pickers. No DB imports here.
import { z } from "zod";

export type TriggerChar = "/" | "@";

/** The "/word" or "@word" token the caret is in: `start` is the trigger's index, `end` the caret. */
export interface Trigger {
  char: TriggerChar;
  query: string;
  start: number;
  end: number;
}

/**
 * Finds the trigger token that ends at the caret. A trigger counts only at the start of the text
 * or right after whitespace, so "and/or", "http://x" and "me@example.com" don't open a picker,
 * and the query can't contain whitespace (typing a space closes the picker).
 */
export function findTrigger(text: string, caret: number = text.length): Trigger | null {
  if (caret < 1 || caret > text.length) return null;
  let i = caret - 1;
  while (i >= 0 && !/\s/.test(text[i]) && text[i] !== "/" && text[i] !== "@") i--;
  if (i < 0) return null;
  const char = text[i];
  if (char !== "/" && char !== "@") return null;
  if (i > 0 && !/\s/.test(text[i - 1])) return null;
  return { char, query: text.slice(i + 1, caret), start: i, end: caret };
}

/** Removes a trigger token (and one following space) from the text; returns the text and new caret. */
export function removeTrigger(text: string, t: Pick<Trigger, "start" | "end">) {
  const after = text.slice(t.end).replace(/^ /, "");
  const before = text.slice(0, t.start);
  return { text: before + after, caret: before.length };
}

/** Replaces a trigger token with `insert`; returns the text and the caret just after the insert. */
export function replaceTrigger(text: string, t: Pick<Trigger, "start" | "end">, insert: string) {
  const before = text.slice(0, t.start) + insert;
  return { text: before + text.slice(t.end), caret: before.length };
}

export type PickerKind = "command" | "skill" | "folder" | "knowledge" | "mcp" | "upload";

export interface PickerItem {
  kind: PickerKind;
  id: string;
  label: string;
  description?: string | null;
  /** Section heading the item is listed under. */
  group: string;
  /** Extra text shown after the label, e.g. a command's argument hint. */
  hint?: string | null;
}

/**
 * How well `item` matches `query` (lower is better), or null for no match. Labels are compared
 * whole and after any "plugin:" namespace, so "rev" finds both "review" and "acme:review".
 */
export function matchRank(item: Pick<PickerItem, "label" | "description">, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = item.label.toLowerCase();
  const bare = label.includes(":") ? label.slice(label.lastIndexOf(":") + 1) : label;
  if (label.startsWith(q) || bare.startsWith(q)) return 0;
  if (label.split(/[\s:_\-/.]+/).some((w) => w.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if (item.description?.toLowerCase().includes(q)) return 3;
  return null;
}

/**
 * Filters and orders picker items for a query: groups keep their first-seen order, items inside a
 * group are sorted by match quality, and each group shows at most `perGroup` items.
 */
export function filterItems(items: PickerItem[], query: string, perGroup = 6): PickerItem[] {
  const groups = new Map<string, { item: PickerItem; rank: number; i: number }[]>();
  items.forEach((item, i) => {
    const rank = matchRank(item, query);
    if (rank === null) return;
    const list = groups.get(item.group) ?? [];
    list.push({ item, rank, i });
    groups.set(item.group, list);
  });
  return [...groups.values()].flatMap((list) =>
    list
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .slice(0, perGroup)
      .map((x) => x.item),
  );
}

/** Splits an already-filtered list into consecutive [group, items] sections. */
export function sections(items: PickerItem[]): { group: string; items: PickerItem[] }[] {
  const out: { group: string; items: PickerItem[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last?.group === item.group) last.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}

/** Context mentions sent to the server; uploads travel as ordinary file parts instead. */
export const MENTION_TYPES = ["folder", "knowledge", "mcp"] as const;
export type MentionType = (typeof MENTION_TYPES)[number];

export const MAX_TURN_SKILLS = 5;
export const MAX_TURN_MENTIONS = 10;

/** The skills and mentions attached to one message, as sent in /api/chat's `context`. */
export const turnContextSchema = z.object({
  skillIds: z.array(z.string().min(1).max(64)).max(MAX_TURN_SKILLS).default([]),
  mentions: z
    .array(z.object({ type: z.enum(MENTION_TYPES), id: z.string().min(1).max(64) }))
    .max(MAX_TURN_MENTIONS)
    .default([]),
});

export type TurnContext = z.infer<typeof turnContextSchema>;

export const isEmptyContext = (c: TurnContext | undefined | null) => !c || (!c.skillIds.length && !c.mentions.length);
