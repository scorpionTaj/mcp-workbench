import { describe, expect, it } from "vitest";
import { buildBranchTree, sharedPrefixLength, type BranchChat, type BranchMessage } from "./chat-branches";

const chat = (id: string, forkedFromId: string | null, t: number): BranchChat => ({
  id,
  title: id.toUpperCase(),
  forkedFromId,
  createdAt: new Date(t),
});

// A copy keeps role and timestamp but gets a new id, as forkChat does.
const msgs = (chatId: string, ...turns: [string, number][]): BranchMessage[] =>
  turns.map(([role, t], i) => ({ id: `${chatId}-${i}`, role, createdAt: t, preview: `${role} ${t}` }));

describe("chat branches", () => {
  it("counts the shared prefix by role and timestamp", () => {
    const a = msgs("a", ["user", 1], ["assistant", 2], ["user", 3]);
    const b = msgs("b", ["user", 1], ["assistant", 2], ["user", 9]);
    expect(sharedPrefixLength(a, b)).toBe(2);
    expect(sharedPrefixLength(a, [])).toBe(0);
    expect(sharedPrefixLength(a, a.slice(0, 1))).toBe(1);
  });

  it("lays out the tree depth-first, children oldest first, with where each branch diverged", () => {
    const chats = [chat("c2", "root", 30), chat("root", null, 10), chat("c1", "root", 20), chat("g1", "c1", 40)];
    const messages = new Map([
      ["root", msgs("root", ["user", 1], ["assistant", 2], ["user", 3], ["assistant", 4])],
      ["c1", msgs("c1", ["user", 1], ["assistant", 2], ["user", 5])],
      ["c2", msgs("c2", ["user", 1], ["assistant", 2], ["user", 3], ["assistant", 4], ["user", 6])],
      ["g1", msgs("g1", ["user", 1], ["assistant", 2])],
    ]);
    const nodes = buildBranchTree("root", chats, messages);
    expect(nodes.map((n) => [n.id, n.depth, n.parentId])).toEqual([
      ["root", 0, null],
      ["c1", 1, "root"],
      ["g1", 2, "c1"],
      ["c2", 1, "root"],
    ]);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId.root.divergedAt).toBeNull();
    expect(byId.root.messageCount).toBe(4);
    expect(byId.c1.divergedAt).toEqual({ index: 1, messageId: "c1-1", role: "assistant", preview: "assistant 2" });
    expect(byId.c2.divergedAt?.index).toBe(3);
    expect(byId.g1.divergedAt?.messageId).toBe("g1-1");
  });

  it("has no divergence point when nothing is shared", () => {
    const nodes = buildBranchTree("r", [chat("r", null, 1), chat("k", "r", 2)], new Map([["r", msgs("r", ["user", 1])]]));
    expect(nodes[1]).toMatchObject({ id: "k", messageCount: 0, divergedAt: null });
  });

  it("ignores unreachable chats and survives a cycle", () => {
    const chats = [chat("a", "b", 1), chat("b", "a", 2), chat("x", "elsewhere", 3)];
    expect(buildBranchTree("a", chats, new Map()).map((n) => n.id)).toEqual(["a", "b"]);
    expect(buildBranchTree("missing", chats, new Map())).toEqual([]);
  });
});
