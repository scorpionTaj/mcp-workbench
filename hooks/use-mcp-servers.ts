"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface McpServerInfo {
  id: string;
  name: string;
  description: string | null;
  url: string;
  transport: "http" | "sse";
  enabled: boolean;
  approval: "never" | "readonly" | "always";
  disabledTools: string[];
  registryName: string | null;
  headerNames: string[];
  createdAt: string;
}

export type McpServerInput = Partial<Omit<McpServerInfo, "id" | "headerNames" | "createdAt">> & {
  headers?: Record<string, string>;
};

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

export function useMcpServers() {
  const { data, error, isLoading, mutate } = useSWR<McpServerInfo[]>("/api/mcp/servers", fetcher, {
    revalidateOnFocus: false,
  });

  return {
    servers: data ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
    addServer: async (input: McpServerInput) => {
      const server = (await send("/api/mcp/servers", "POST", input)) as McpServerInfo;
      await mutate();
      return server;
    },
    updateServer: async (id: string, patch: McpServerInput) => {
      await send(`/api/mcp/servers/${id}`, "PATCH", patch);
      await mutate();
    },
    removeServer: async (id: string) => {
      await send(`/api/mcp/servers/${id}`, "DELETE");
      await mutate();
    },
  };
}
