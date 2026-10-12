import { describe, expect, it } from "vitest";
import { MockRerankingModelV4 } from "ai/test";
import { rerankHits } from "@/lib/knowledge";

const candidates = [
  { id: "a", score: 0.9 },
  { id: "b", score: 0.8 },
  { id: "c", score: 0.7 },
  { id: "gone", score: 0.6 }, // chunk deleted between search and fetch
];
const byId = new Map([
  ["a", { content: "about cats" }],
  ["b", { content: "about rain" }],
  ["c", { content: "about weather and rain" }],
]);

describe("knowledge reranking", () => {
  it("reorders candidates by the reranker and keeps the top N", async () => {
    let seen: unknown;
    const model = new MockRerankingModelV4({
      doRerank: async (opts) => {
        seen = opts.documents;
        return { ranking: [{ index: 2, relevanceScore: 0.95 }, { index: 1, relevanceScore: 0.9 }] };
      },
    });
    const out = await rerankHits(async () => model, "rain", candidates, byId, 2);
    expect(out).toEqual([{ id: "c", score: 0.95 }, { id: "b", score: 0.9 }]);
    expect(seen).toMatchObject({ values: ["about cats", "about rain", "about weather and rain"] });
  });

  it("falls back to the hybrid order when the reranker fails", async () => {
    const out = await rerankHits(async () => { throw new Error("no key"); }, "rain", candidates, byId, 2);
    expect(out).toEqual([{ id: "a", score: 0.9 }, { id: "b", score: 0.8 }]);
  });
});
