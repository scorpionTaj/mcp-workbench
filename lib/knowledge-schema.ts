import { embed, rerank } from "ai";
import { z } from "zod";
import { getEmbeddingModel, getRerankingModel, ProviderError, RERANK_PROVIDERS } from "@/lib/models";
import type { KeyUser } from "@/lib/server-keys";

export const knowledgeBaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  embeddingProvider: z.string().min(1).max(50),
  embeddingModel: z.string().min(1).max(200),
  chunkSize: z.number().int().min(200).max(8000).default(1000),
  chunkOverlap: z.number().int().min(0).max(2000).default(150),
  rerankProvider: z.enum(RERANK_PROVIDERS).nullable().optional(),
  rerankModel: z.string().trim().min(1).max(200).nullable().optional(),
});

/** A reranker needs both fields; test-call it so a bad model fails at save time, not mid-chat. */
export async function checkReranker(
  user: KeyUser,
  data: { rerankProvider?: string | null; rerankModel?: string | null },
): Promise<string | null> {
  if (!data.rerankProvider && !data.rerankModel) return null;
  if (!data.rerankProvider || !data.rerankModel) return "Choose both a reranking provider and model, or neither";
  try {
    const model = await getRerankingModel(user, data.rerankProvider, data.rerankModel);
    await rerank({ model, documents: ["test"], query: "test", maxRetries: 0 });
    return null;
  } catch (err) {
    return `Reranking model check failed: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

export async function checkEmbeddingModel(user: KeyUser, provider: string, modelName: string): Promise<string | null> {
  try {
    const model = await getEmbeddingModel(user, provider, modelName);
    await embed({ model, value: "test", maxRetries: 0 });
    return null;
  } catch (err) {
    const message = err instanceof ProviderError || err instanceof Error ? err.message : "unknown error";
    return `Embedding model check failed: ${message}`;
  }
}
