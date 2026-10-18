"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface ComposerData {
  plugins: { id: string; name: string }[];
  commands: {
    id: string;
    name: string;
    description: string | null;
    argumentHint: string | null;
    prompt: string;
    pluginId: string | null;
  }[];
  skills: { id: string; name: string; description: string; pluginId: string | null }[];
  folders: { id: string; name: string }[];
  knowledgeBases: { id: string; name: string; description: string | null }[];
  mcpServers: { id: string; name: string; description: string | null }[];
  uploads: { url: string; name: string; mediaType: string; createdAt: string }[];
}

const EMPTY: ComposerData = {
  plugins: [],
  commands: [],
  skills: [],
  folders: [],
  knowledgeBases: [],
  mcpServers: [],
  uploads: [],
};

/** What the chat composer's "/" and "@" pickers can offer (GET /api/composer). */
export function useComposerData() {
  const { data, mutate } = useSWR<ComposerData>("/api/composer", fetcher, { dedupingInterval: 10_000 });
  return { data: data ?? EMPTY, refresh: mutate };
}
