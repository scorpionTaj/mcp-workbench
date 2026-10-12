"use client";

import useSWR from "swr";
import type { Dataset } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

export function useDatasets() {
  const { data, error, isLoading, mutate } = useSWR<Dataset[]>("/api/datasets", fetcher, { revalidateOnFocus: true });
  return {
    datasets: data ?? [],
    isLoading,
    isError: error,
    refresh: mutate,
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/datasets/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status})`);
      await mutate();
    },
    deleteDataset: async (id: string) => {
      await send(`/api/datasets/${id}`, "DELETE");
      await mutate();
    },
    /** Adds the dataset's rows to a knowledge base as text records. */
    addToKnowledge: async (id: string, knowledgeBaseId: string, maxRows: number) => {
      const result = await send<{ rows: number; totalRows: number }>(`/api/datasets/${id}/index`, "POST", { knowledgeBaseId, maxRows });
      await mutate();
      return result;
    },
  };
}
