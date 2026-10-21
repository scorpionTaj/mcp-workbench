import { NextResponse } from "next/server";
import { cosineSimilarity, embedMany } from "ai";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { getEmbeddingModel, ProviderError } from "@/lib/models";

export const maxDuration = 60;

/**
 * Embeds up to 20 texts with any provider's embedding model and returns the vectors plus their
 * pairwise cosine similarity, for the Embeddings playground.
 */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(
    req,
    z.object({
      provider: z.string().min(1).max(50),
      model: z.string().min(1).max(200),
      input: z.union([z.string().min(1).max(20_000), z.array(z.string().min(1).max(20_000)).min(1).max(20)]),
    }),
  );
  if (error) return error;
  const values = Array.isArray(data.input) ? data.input : [data.input];
  const started = Date.now();
  try {
    const model = await getEmbeddingModel(user, data.provider, data.model);
    const { embeddings, usage } = await embedMany({ model, values, maxRetries: 1 });
    return NextResponse.json({
      embeddings,
      dimensions: embeddings[0]?.length ?? 0,
      similarity: embeddings.map((a) => embeddings.map((b) => Number(cosineSimilarity(a, b).toFixed(4)))),
      tokens: usage?.tokens ?? null,
      ms: Date.now() - started,
    });
  } catch (err) {
    const status = err instanceof ProviderError ? 400 : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Embedding failed" }, { status });
  }
});
