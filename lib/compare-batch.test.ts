import { describe, expect, it } from "vitest";
import { MAX_BATCH_PROMPTS, csvField, parseBatchPrompts, runPool, toCsv } from "./compare-batch";

describe("parseBatchPrompts", () => {
  it("reads one prompt per line, trimming and skipping blank lines", () => {
    expect(parseBatchPrompts("  first \r\n\nsecond, with a comma\n\n")).toEqual({
      prompts: ["first", "second, with a comma"],
    });
  });

  it("reads the prompt column of a CSV, with quoted multi-line cells", () => {
    const csv = 'id,Prompt,notes\n1,"Write a haiku,\nplease",x\n2,,skip\n3,Explain "LCS",y\n';
    expect(parseBatchPrompts(csv).prompts).toEqual(["Write a haiku,\nplease", 'Explain "LCS"']);
  });

  it("reads a TSV by file name", () => {
    expect(parseBatchPrompts("prompt\tlang\nBonjour\tfr\n", "list.tsv").prompts).toEqual(["Bonjour"]);
  });

  it("rejects a .csv file without a prompt column", () => {
    const r = parseBatchPrompts("question,answer\nq,a\n", "data.csv");
    expect(r.prompts).toEqual([]);
    expect(r.warning).toMatch(/prompt/);
  });

  it("caps the list and warns", () => {
    const r = parseBatchPrompts(Array.from({ length: MAX_BATCH_PROMPTS + 5 }, (_, i) => `p${i}`).join("\n"));
    expect(r.prompts).toHaveLength(MAX_BATCH_PROMPTS);
    expect(r.warning).toMatch(/first 100 of 105/);
  });

  it("drops prompts that are too long", () => {
    const r = parseBatchPrompts(`ok\n${"x".repeat(20_001)}`);
    expect(r.prompts).toEqual(["ok"]);
    expect(r.warning).toMatch(/Skipped 1/);
  });
});

describe("runPool", () => {
  it("never runs more than the limit at once and runs every item", async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      done.push(n);
    });
    expect(peak).toBe(3);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("stops starting items once aborted", async () => {
    const ctrl = new AbortController();
    const started: number[] = [];
    await runPool(
      [0, 1, 2, 3, 4],
      1,
      async (n) => {
        started.push(n);
        if (n === 1) ctrl.abort();
      },
      ctrl.signal,
    );
    expect(started).toEqual([0, 1]);
  });
});

describe("toCsv", () => {
  it("quotes fields that need it", () => {
    expect(csvField('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvField(null)).toBe("");
    expect(toCsv(["a", "b"], [["x\ny", 3]])).toBe('a,b\r\n"x\ny",3\r\n');
  });
});
