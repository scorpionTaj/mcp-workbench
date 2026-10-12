"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

export interface KnowledgeBaseInfo {
  id: string;
  name: string;
  description: string | null;
  embeddingProvider: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  rerankProvider: string | null;
  rerankModel: string | null;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface KnowledgeDocumentInfo {
  id: string;
  name: string;
  mime: string;
  size: number;
  sourceUrl: string | null;
  status: "processing" | "ready" | "error";
  error: string | null;
  chunkCount: number;
  createdAt: string;
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

export type KnowledgeBaseInput = Pick<KnowledgeBaseInfo, "name" | "description" | "embeddingProvider" | "embeddingModel" | "chunkSize" | "chunkOverlap">;

export function useKnowledgeBases() {
  const { data, isLoading, error, mutate } = useSWR<KnowledgeBaseInfo[]>("/api/knowledge", fetcher, {
    revalidateOnFocus: false,
  });
  return {
    knowledgeBases: data ?? [],
    isLoading,
    error,
    mutate,
    create: async (input: KnowledgeBaseInput) => {
      const kb = await send<KnowledgeBaseInfo>("/api/knowledge", "POST", input);
      await mutate();
      return kb;
    },
    remove: async (id: string) => {
      await send(`/api/knowledge/${id}`, "DELETE");
      await mutate();
    },
    search: (knowledgeBaseIds: string[], query: string, limit = 8) =>
      send<{ hits: SearchHit[]; ms: number }>("/api/knowledge/search", "POST", { knowledgeBaseIds, query, limit }),
  };
}

/** One knowledge base and its documents; polls while any document is still processing. */
export function useKnowledgeBase(id: string | null) {
  const { data, isLoading, mutate } = useSWR<KnowledgeBaseInfo & { documents: KnowledgeDocumentInfo[] }>(
    id ? `/api/knowledge/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: (latest) => (latest?.documents.some((d) => d.status === "processing") ? 1500 : 0),
    },
  );
  const { mutate: refreshList } = useKnowledgeBases();
  const refresh = async () => {
    await Promise.all([mutate(), refreshList()]);
  };
  return {
    knowledgeBase: data,
    isLoading,
    addFiles: async (files: File[]) => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch(`/api/knowledge/${id}/documents`, { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      await refresh();
      if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status})`);
      return body as { errors: string[] };
    },
    addUrl: async (url: string) => {
      await send(`/api/knowledge/${id}/documents`, "POST", { url });
      await refresh();
    },
    addText: async (name: string, text: string) => {
      await send(`/api/knowledge/${id}/documents`, "POST", { name, text });
      await refresh();
    },
    removeDocument: async (docId: string) => {
      await send(`/api/knowledge/${id}/documents/${docId}`, "DELETE");
      await refresh();
    },
    setReranker: async (rerankProvider: string | null, rerankModel: string | null) => {
      await send(`/api/knowledge/${id}`, "PATCH", { rerankProvider, rerankModel });
      await refresh();
    },
    getChunks: (docId: string) =>
      fetcher<KnowledgeDocumentInfo & { chunks: { position: number; content: string }[] }>(`/api/knowledge/${id}/documents/${docId}`),
  };
}
