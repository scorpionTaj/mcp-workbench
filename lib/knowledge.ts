import { embed, embedMany, tool, type ToolSet } from "ai";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getEmbeddingModel } from "@/lib/models";
import { checkOutboundUrl } from "@/lib/url-guard";
import { chunkText, htmlToText, keywordQuery, reciprocalRankFusion } from "@/lib/rag-text";
import logger from "@/lib/logger";
import type { KnowledgeBase } from "@/lib/schema";

export const KNOWLEDGE_LIMITS = {
  fileBytes: 20 * 1024 * 1024,
  textChars: 2_000_000,
  chunksPerDocument: 4000,
};

const TEXT_TYPES = /\.(txt|md|markdown|mdx|csv|tsv|json|jsonl|ya?ml|xml|log|rst|tex|[cm]?[jt]sx?|py|go|rs|java|rb|php|c|cc|cpp|h|hpp|cs|swift|kt|sql|sh|toml|ini)$/i;

export class KnowledgeError extends Error {}

/** Plain text from an uploaded file. PDFs are parsed; HTML is stripped; other text is used as is. */
export async function extractText(name: string, bytes: Uint8Array): Promise<{ text: string; mime: string }> {
  if (/\.pdf$/i.test(name)) {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await pdfText(pdf, { mergePages: false });
    return { text: text.join("\n\n"), mime: "application/pdf" };
  }
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (/\.html?$/i.test(name)) return { text: htmlToText(raw).text, mime: "text/html" };
  if (TEXT_TYPES.test(name)) return { text: raw, mime: "text/plain" };
  throw new KnowledgeError(`Unsupported file type: ${name} (use PDF, HTML, Markdown, text, code, CSV or JSON)`);
}

/** Fetches a public web page or text/PDF file for ingestion. */
export async function fetchUrl(url: string): Promise<{ name: string; text: string; mime: string }> {
  const problem = await checkOutboundUrl(url);
  if (problem) throw new KnowledgeError(`URL rejected: ${problem}`);
  const res = await fetch(url, {
    redirect: "error", // a redirect could point at an internal address
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "MCP-Workbench/1.0 (+knowledge ingestion)" },
  });
  if (!res.ok) throw new KnowledgeError(`Fetching the URL failed (${res.status})`);
  if (Number(res.headers.get("content-length") ?? 0) > KNOWLEDGE_LIMITS.fileBytes) {
    throw new KnowledgeError("That page is larger than 20 MB");
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > KNOWLEDGE_LIMITS.fileBytes) throw new KnowledgeError("That page is larger than 20 MB");

  const type = res.headers.get("content-type") ?? "";
  const path = new URL(url).pathname;
  const fallbackName = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? new URL(url).hostname);
  if (type.includes("pdf") || /\.pdf$/i.test(path)) {
    return { name: fallbackName, ...(await extractText("page.pdf", bytes)) };
  }
  const raw = new TextDecoder().decode(bytes);
  if (type.includes("html") || /<html[\s>]/i.test(raw.slice(0, 1000))) {
    const { title, text } = htmlToText(raw);
    return { name: title || fallbackName, text, mime: "text/html" };
  }
  return { name: fallbackName, text: raw, mime: type.split(";")[0] || "text/plain" };
}

/** Creates the document row; chunking and embedding run afterwards via processDocument. */
export async function addDocument(
  kb: KnowledgeBase,
  input: { name: string; text: string; mime: string; sourceUrl?: string | null },
) {
  const text = input.text.slice(0, KNOWLEDGE_LIMITS.textChars);
  if (!text.trim()) throw new KnowledgeError("No text could be extracted from that source");
  const [doc] = await db
    .insert(schema.knowledgeDocuments)
    .values({
      knowledgeBaseId: kb.id,
      name: input.name.slice(0, 300),
      mime: input.mime,
      size: text.length,
      sourceUrl: input.sourceUrl ?? null,
    })
    .returning();
  return { doc, text };
}

/** Chunks, embeds and stores a document. Errors are recorded on the document, not thrown. */
export async function processDocument(userId: string, kb: KnowledgeBase, documentId: string, text: string) {
  try {
    const chunks = chunkText(text, kb.chunkSize, kb.chunkOverlap).slice(0, KNOWLEDGE_LIMITS.chunksPerDocument);
    const model = await getEmbeddingModel(userId, kb.embeddingProvider, kb.embeddingModel);
    // Batches keep requests under provider input limits and let a failure stop early.
    for (let i = 0; i < chunks.length; i += 96) {
      const batch = chunks.slice(i, i + 96);
      const { embeddings } = await embedMany({ model, values: batch.map((c) => c.content), maxParallelCalls: 2 });
      await db.insert(schema.knowledgeChunks).values(
        batch.map((c, j) => ({
          knowledgeBaseId: kb.id,
          documentId,
          position: c.position,
          content: c.content,
          embedding: embeddings[j],
        })),
      );
    }
    await db
      .update(schema.knowledgeDocuments)
      .set({ status: "ready", chunkCount: chunks.length, error: null })
      .where(eq(schema.knowledgeDocuments.id, documentId));
  } catch (err) {
    logger.error({ err, documentId }, "Knowledge ingestion failed");
    await db.delete(schema.knowledgeChunks).where(eq(schema.knowledgeChunks.documentId, documentId));
    await db
      .update(schema.knowledgeDocuments)
      .set({ status: "error", error: err instanceof Error ? err.message.slice(0, 500) : "Ingestion failed" })
      .where(eq(schema.knowledgeDocuments.id, documentId));
  }
}

export interface SearchHit {
  chunkId: string;
  documentId: string;
  document: string;
  sourceUrl: string | null;
  knowledgeBase: string;
  position: number;
  content: string;
  score: number;
}

/**
 * Hybrid search over the user's knowledge bases: cosine similarity on embeddings (one query
 * embedding per embedding model) plus Postgres full-text rank (English stemming), merged by
 * reciprocal rank fusion.
 */
export async function searchKnowledge(userId: string, knowledgeBaseIds: string[], query: string, limit = 6) {
  const kbs = await db.query.knowledgeBases.findMany({
    where: and(eq(schema.knowledgeBases.userId, userId), inArray(schema.knowledgeBases.id, knowledgeBaseIds)),
  });
  if (!kbs.length || !query.trim()) return [];
  const ids = kbs.map((k) => k.id);
  const pool = Math.max(limit * 4, 20);
  const { knowledgeChunks: c } = schema;

  const byModel = new Map<string, KnowledgeBase[]>();
  for (const kb of kbs) {
    const key = `${kb.embeddingProvider}\u0000${kb.embeddingModel}`;
    byModel.set(key, [...(byModel.get(key) ?? []), kb]);
  }
  const vectorLists = await Promise.all(
    [...byModel.values()].map(async (group) => {
      const { embedding } = await embed({
        model: await getEmbeddingModel(userId, group[0].embeddingProvider, group[0].embeddingModel),
        value: query,
      });
      const v = `[${embedding.join(",")}]`;
      const rows = await db
        .select({ id: c.id })
        .from(c)
        .where(inArray(c.knowledgeBaseId, group.map((k) => k.id)))
        .orderBy(sql`${c.embedding} <=> ${v}::vector`)
        .limit(pool);
      return rows.map((r) => r.id);
    }),
  );
  const words = keywordQuery(query);
  const tsq = sql`to_tsquery('english', ${words})`;
  const keyword = words
    ? await db
        .select({ id: c.id })
        .from(c)
        .where(and(inArray(c.knowledgeBaseId, ids), sql`${c.tsv} @@ ${tsq}`))
        .orderBy(sql`ts_rank_cd(${c.tsv}, ${tsq}) desc`)
        .limit(pool)
    : [];

  const fused = reciprocalRankFusion([...vectorLists, keyword.map((r) => r.id)]).slice(0, limit);
  if (!fused.length) return [];
  const rows = await db
    .select({
      chunkId: c.id,
      documentId: c.documentId,
      position: c.position,
      content: c.content,
      knowledgeBaseId: c.knowledgeBaseId,
      document: schema.knowledgeDocuments.name,
      sourceUrl: schema.knowledgeDocuments.sourceUrl,
    })
    .from(c)
    .innerJoin(schema.knowledgeDocuments, eq(schema.knowledgeDocuments.id, c.documentId))
    .where(inArray(c.id, fused.map((f) => f.id)));
  const byId = new Map(rows.map((r) => [r.chunkId, r]));
  const kbName = new Map(kbs.map((k) => [k.id, k.name]));
  return fused.flatMap(({ id, score }): SearchHit[] => {
    const r = byId.get(id);
    if (!r) return [];
    const { knowledgeBaseId, ...hit } = r;
    return [{ ...hit, knowledgeBase: kbName.get(knowledgeBaseId) ?? "", score: Number(score.toFixed(4)) }];
  });
}

/** The search_knowledge tool for a chat, plus a system note naming the attached knowledge bases. */
export async function loadChatKnowledge(userId: string, knowledgeBaseIds: string[]) {
  const kbs = knowledgeBaseIds.length
    ? await db.query.knowledgeBases.findMany({
        where: and(eq(schema.knowledgeBases.userId, userId), inArray(schema.knowledgeBases.id, knowledgeBaseIds)),
        columns: { id: true, name: true, description: true },
      })
    : [];
  if (!kbs.length) return { system: undefined, tools: {} as ToolSet };

  const list = kbs.map((k) => `- ${k.name}${k.description ? `: ${k.description}` : ""}`).join("\n");
  return {
    system:
      `You can search these knowledge bases with the search_knowledge tool:\n${list}\n` +
      "Search them before answering questions they may cover, answer from the passages you find, " +
      "and cite each fact with its source in brackets, e.g. [handbook.pdf]. If nothing relevant is found, say so.",
    tools: {
      search_knowledge: tool({
        description: "Search the attached knowledge bases (hybrid semantic + keyword) and return the most relevant passages.",
        inputSchema: z.object({
          query: z.string().min(1).describe("What to look for; a full question works best."),
          limit: z.number().int().min(1).max(12).optional().describe("Passages to return (default 6)."),
        }),
        execute: async ({ query, limit }) => {
          const hits = await searchKnowledge(userId, kbs.map((k) => k.id), query, limit ?? 6);
          if (!hits.length) return { results: [], note: "No matching passages." };
          return {
            results: hits.map((h) => ({
              source: h.document,
              ...(h.sourceUrl && { url: h.sourceUrl }),
              knowledgeBase: h.knowledgeBase,
              passage: h.content,
            })),
          };
        },
      }),
    } as ToolSet,
  };
}
