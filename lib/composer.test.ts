import { describe, expect, it } from "vitest";
import {
  filterItems,
  findTrigger,
  matchRank,
  removeTrigger,
  replaceTrigger,
  sections,
  turnContextSchema,
  isEmptyContext,
  type PickerItem,
} from "@/lib/composer";

describe("findTrigger", () => {
  it("finds a trigger at the start of the text or after whitespace", () => {
    expect(findTrigger("/rev")).toEqual({ char: "/", query: "rev", start: 0, end: 4 });
    expect(findTrigger("look at @docs")).toEqual({ char: "@", query: "docs", start: 8, end: 13 });
    expect(findTrigger("first line\n@kb")).toMatchObject({ char: "@", query: "kb", start: 11 });
    expect(findTrigger("@")).toEqual({ char: "@", query: "", start: 0, end: 1 });
  });

  it("ignores triggers inside words, URLs and email addresses", () => {
    expect(findTrigger("and/or")).toBeNull();
    expect(findTrigger("see http://x")).toBeNull();
    expect(findTrigger("mail me@example.com")).toBeNull();
    expect(findTrigger("plain text")).toBeNull();
    expect(findTrigger("")).toBeNull();
  });

  it("closes once the query has whitespace after it", () => {
    expect(findTrigger("/review ")).toBeNull();
    expect(findTrigger("@docs and more")).toBeNull();
  });

  it("uses the caret, not the end of the text", () => {
    const text = "hi @kno there";
    expect(findTrigger(text, 7)).toEqual({ char: "@", query: "kno", start: 3, end: 7 });
    expect(findTrigger(text, 13)).toBeNull();
    expect(findTrigger(text, 0)).toBeNull();
    expect(findTrigger(text, 99)).toBeNull();
  });

  it("takes the nearest trigger before the caret", () => {
    expect(findTrigger("/cmd @x")).toMatchObject({ char: "@", query: "x" });
    expect(findTrigger("@a/b")).toBeNull(); // "/" inside a word
  });
});

describe("trigger edits", () => {
  it("removes the token and one following space", () => {
    expect(removeTrigger("ask @docs about it", { start: 4, end: 9 })).toEqual({ text: "ask about it", caret: 4 });
    expect(removeTrigger("@docs", { start: 0, end: 5 })).toEqual({ text: "", caret: 0 });
  });

  it("replaces the token and puts the caret after the insert", () => {
    expect(replaceTrigger("/re", { start: 0, end: 3 }, "/review ")).toEqual({ text: "/review ", caret: 8 });
    expect(replaceTrigger("/re tail", { start: 0, end: 3 }, "/review ")).toEqual({ text: "/review  tail", caret: 8 });
  });
});

const item = (label: string, group: string, description?: string): PickerItem => ({
  kind: "skill",
  id: label,
  label,
  group,
  description,
});

describe("matching", () => {
  it("ranks prefix, word, substring and description matches", () => {
    expect(matchRank(item("review", "g"), "rev")).toBe(0);
    expect(matchRank(item("acme:review", "g"), "rev")).toBe(0);
    expect(matchRank(item("code-review", "g"), "rev")).toBe(1);
    expect(matchRank(item("prereview", "g"), "rev")).toBe(2);
    expect(matchRank(item("lint", "g", "Reviews style"), "rev")).toBe(3);
    expect(matchRank(item("lint", "g"), "rev")).toBeNull();
    expect(matchRank(item("Lint", "g"), "LI")).toBe(0);
    expect(matchRank(item("anything", "g"), "")).toBe(0);
  });

  it("keeps group order, sorts inside groups and caps each group", () => {
    const items = [
      item("prereview", "Skills"),
      item("review", "Skills"),
      item("lint", "Skills"),
      item("acme:review", "Plugin · acme"),
      item("code-review", "Commands"),
    ];
    expect(filterItems(items, "rev").map((i) => i.label)).toEqual(["review", "prereview", "acme:review", "code-review"]);
    expect(filterItems(items, "", 2).map((i) => i.label)).toEqual(["prereview", "review", "acme:review", "code-review"]);
    expect(filterItems(items, "zzz")).toEqual([]);
  });

  it("splits into consecutive sections", () => {
    const s = sections([item("a", "X"), item("b", "X"), item("c", "Y")]);
    expect(s.map((x) => [x.group, x.items.length])).toEqual([
      ["X", 2],
      ["Y", 1],
    ]);
  });
});

describe("turnContextSchema", () => {
  it("defaults to empty and accepts known mention types", () => {
    expect(turnContextSchema.parse({})).toEqual({ skillIds: [], mentions: [] });
    expect(isEmptyContext(turnContextSchema.parse({}))).toBe(true);
    const ctx = turnContextSchema.parse({ skillIds: ["s1"], mentions: [{ type: "knowledge", id: "kb1" }] });
    expect(isEmptyContext(ctx)).toBe(false);
  });

  it("rejects unknown types and oversized lists", () => {
    expect(turnContextSchema.safeParse({ mentions: [{ type: "user", id: "x" }] }).success).toBe(false);
    expect(turnContextSchema.safeParse({ skillIds: Array.from({ length: 6 }, (_, i) => `s${i}`) }).success).toBe(false);
    expect(turnContextSchema.safeParse({ skillIds: [""] }).success).toBe(false);
  });
});
