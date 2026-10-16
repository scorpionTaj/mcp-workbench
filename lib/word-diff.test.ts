import { describe, expect, it } from "vitest";
import { diffStats, diffWords, tokenize, type DiffPart } from "./word-diff";

const side = (parts: DiffPart[], keep: "a" | "b") =>
  parts
    .filter((p) => p.op === "equal" || p.op === (keep === "a" ? "delete" : "insert"))
    .map((p) => p.text)
    .join("");

describe("tokenize", () => {
  it("keeps whitespace and punctuation so tokens join back to the text", () => {
    const text = "Hello,  world!\nIt's 42 — café_bar.";
    expect(tokenize(text).join("")).toBe(text);
    expect(tokenize("a, b")).toEqual(["a", ",", " ", "b"]);
  });
});

describe("diffWords", () => {
  it("returns one equal part for identical text and nothing for two empty strings", () => {
    expect(diffWords("same text", "same text")).toEqual([{ op: "equal", text: "same text" }]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("marks a replaced word as a delete then an insert", () => {
    expect(diffWords("the quick fox", "the slow fox")).toEqual([
      { op: "equal", text: "the " },
      { op: "delete", text: "quick" },
      { op: "insert", text: "slow" },
      { op: "equal", text: " fox" },
    ]);
  });

  it("handles pure insertions and deletions, including against empty text", () => {
    expect(diffWords("a c", "a b c")).toEqual([
      { op: "equal", text: "a " },
      { op: "insert", text: "b " },
      { op: "equal", text: "c" },
    ]);
    expect(diffWords("", "new")).toEqual([{ op: "insert", text: "new" }]);
    expect(diffWords("old", "")).toEqual([{ op: "delete", text: "old" }]);
  });

  it("always rebuilds both inputs from its parts and merges neighbours", () => {
    const pairs: [string, string][] = [
      ["The cat sat on the mat.", "A cat lay on a mat, quietly."],
      ["one two three four five", "five four three two one"],
      ["line one\nline two\n", "line one\nline 2\nline three\n"],
    ];
    for (const [a, b] of pairs) {
      const parts = diffWords(a, b);
      expect(side(parts, "a")).toBe(a);
      expect(side(parts, "b")).toBe(b);
      for (let i = 1; i < parts.length; i++) expect(parts[i].op).not.toBe(parts[i - 1].op);
    }
  });

  it("keeps the most words in common", () => {
    const parts = diffWords("one two three four five", "five four three two one");
    const equalWords = parts.filter((p) => p.op === "equal").flatMap((p) => p.text.split(/\s+/).filter(Boolean));
    expect(equalWords).toHaveLength(1);
  });

  it("falls back to one replace for very large inputs and stays correct", () => {
    const a = Array.from({ length: 2500 }, (_, i) => `w${i}`).join(" ");
    const b = Array.from({ length: 2500 }, (_, i) => `v${i}`).join(" ");
    const parts = diffWords(`start ${a} end`, `start ${b} end`);
    expect(parts.map((p) => p.op)).toEqual(["equal", "delete", "insert", "equal"]);
    expect(side(parts, "a")).toBe(`start ${a} end`);
  });
});

describe("diffStats", () => {
  it("counts changed words, not whitespace", () => {
    expect(diffStats(diffWords("the quick brown fox", "the slow fox jumps"))).toEqual({ inserted: 2, deleted: 2 });
  });
});
