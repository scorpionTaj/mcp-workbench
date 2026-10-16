import { describe, expect, it } from "vitest";
import {
  chatOrganizationSchema,
  escapeLike,
  matchesFilter,
  MAX_TAGS,
  normalizeTags,
  parseTagInput,
  tagCounts,
} from "./chat-organization";

describe("chat organization", () => {
  it("normalizes tags", () => {
    expect(normalizeTags([" Work ", "#ideas", "work", "", "Long Term"])).toEqual(["work", "ideas", "long-term"]);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS);
    expect(normalizeTags(["x".repeat(50)])[0]).toHaveLength(32);
  });

  it("parses comma or space separated tag input", () => {
    expect(parseTagInput("work, #ideas  research,,")).toEqual(["work", "ideas", "research"]);
  });

  it("normalizes tags in the PATCH schema", () => {
    const parsed = chatOrganizationSchema.parse({ tags: ["A", "a"], folderId: null, pinned: true });
    expect(parsed).toEqual({ tags: ["a"], folderId: null, pinned: true });
    expect(chatOrganizationSchema.safeParse({ folderId: "" }).success).toBe(false);
  });

  it("filters chats by folder, unfiled and tag", () => {
    const a = { pinned: false, folderId: "f1", tags: ["x"] };
    const b = { pinned: true, folderId: null, tags: [] };
    expect(matchesFilter(a, { kind: "all" })).toBe(true);
    expect(matchesFilter(a, { kind: "folder", id: "f1" })).toBe(true);
    expect(matchesFilter(b, { kind: "folder", id: "f1" })).toBe(false);
    expect(matchesFilter(b, { kind: "unfiled" })).toBe(true);
    expect(matchesFilter(a, { kind: "tag", tag: "x" })).toBe(true);
    expect(matchesFilter(b, { kind: "tag", tag: "x" })).toBe(false);
  });

  it("counts tags, most used first", () => {
    const chats = [
      { pinned: false, folderId: null, tags: ["b", "a"] },
      { pinned: false, folderId: null, tags: ["b"] },
    ];
    expect(tagCounts(chats)).toEqual([
      { tag: "b", count: 2 },
      { tag: "a", count: 1 },
    ]);
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
