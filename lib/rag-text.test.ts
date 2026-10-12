import { describe, expect, it } from "vitest";
import { chunkText, htmlToText, keywordQuery, reciprocalRankFusion } from "./rag-text";

describe("chunkText", () => {
  it("keeps short text as one chunk", () => {
    expect(chunkText("Hello world.")).toEqual([{ position: 0, content: "Hello world." }]);
    expect(chunkText("   \n\n ")).toEqual([]);
  });

  it("splits on paragraphs and respects the size limit", () => {
    const paras = Array.from({ length: 20 }, (_, i) => `Paragraph ${i} ` + "word ".repeat(30));
    const chunks = chunkText(paras.join("\n\n"), 400, 50);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(400);
    expect(chunks.map((c) => c.position)).toEqual(chunks.map((_, i) => i));
  });

  it("overlaps consecutive chunks", () => {
    const text = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const [a, b] = chunkText(text, 200, 40);
    const lastWord = a.content.split(" ").pop()!;
    expect(b.content.split(" ").slice(0, 10)).toContain(lastWord);
  });

  it("hard-splits text with no separators", () => {
    const chunks = chunkText("x".repeat(2500), 1000, 0);
    expect(chunks.map((c) => c.content.length)).toEqual([1000, 1000, 500]);
  });
});

describe("htmlToText", () => {
  it("extracts title and readable text without scripts or nav", () => {
    const { title, text } = htmlToText(
      "<html><head><title>Docs &amp; Guide</title><style>p{}</style></head><body><nav>Menu</nav>" +
        "<h1>Intro</h1><p>First&nbsp;para &lt;ok&gt;.</p><script>alert(1)</script><ul><li>One</li><li>Two</li></ul></body></html>",
    );
    expect(title).toBe("Docs & Guide");
    expect(text).toBe("Intro\n\nFirst para <ok>.\n\n- One\n\n- Two");
  });
});

describe("reciprocalRankFusion", () => {
  it("ranks items found by both searches first", () => {
    const fused = reciprocalRankFusion([
      ["a", "b", "c"],
      ["c", "d"],
    ]);
    expect(fused[0].id).toBe("c");
    expect(fused.map((f) => f.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("keywordQuery", () => {
  it("ORs unique words and drops tsquery syntax", () => {
    expect(keywordQuery("When is the TRAINING due? due! (a & b) | !c:*")).toBe("when | is | the | training | due | a | b | c");
    expect(keywordQuery("  ?! ")).toBeNull();
    expect(keywordQuery("café naïve 2024")).toBe("café | naïve | 2024");
  });
});
