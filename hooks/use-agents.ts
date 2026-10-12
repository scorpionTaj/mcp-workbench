"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  systemPrompt: string;
  provider: string | null;
  modelId: string | null;
  temperature: number | null;
  maxSteps: number;
  toolServerIds: string[];
  starterPrompts: string[];
  isPublic: boolean;
  usageCount: number;
  owner: "builtin" | "me" | "community";
}

export type AgentInput = Omit<AgentInfo, "id" | "usageCount" | "owner">;

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function useAgents() {
  const { data, isLoading, error, mutate } = useSWR<AgentInfo[]>("/api/agents", fetcher, { revalidateOnFocus: false });
  return {
    agents: data ?? [],
    isLoading,
    error,
    createAgent: async (input: AgentInput) => {
      await send("/api/agents", "POST", input);
      await mutate();
    },
    updateAgent: async (id: string, input: Partial<AgentInput>) => {
      await send(`/api/agents/${id}`, "PATCH", input);
      await mutate();
    },
    deleteAgent: async (id: string) => {
      await send(`/api/agents/${id}`, "DELETE");
      await mutate();
    },
    /** Creates a chat linked to the agent and returns its id. */
    startChat: async (id: string): Promise<string> => (await send(`/api/agents/${id}/chats`, "POST")).id,
  };
}
