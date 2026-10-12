"use client";

import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

export type PluginSource = { url: string } | { marketplaceUrl: string; name: string };

export interface PluginInfo {
  id: string;
  name: string;
  version: string | null;
  description: string | null;
  author: string | null;
  sourceUrl: string;
  source: PluginSource;
  enabled: boolean;
  warnings: string[];
  installedAt: string;
  updatedAt: string;
  skillCount: number;
  commandCount: number;
  agentCount: number;
  serverCount: number;
}

export interface PluginPreview {
  manifest: { name: string; version: string | null; description: string | null; author: string | null };
  skills: { name: string; description: string; files: number }[];
  agents: { name: string; description: string | null }[];
  commands: { name: string; description: string | null }[];
  mcpServers: { name: string; url: string; missingSecrets: string[] }[];
  warnings: string[];
}

export interface Marketplace {
  name: string;
  plugins: { name: string; description: string | null; version: string | null; category: string | null; installable: boolean }[];
}

// Installing or removing a plugin changes skills, commands, agents and MCP servers too.
const RELATED = ["/api/skills", "/api/commands", "/api/agents", "/api/mcp/servers"];

export function usePlugins() {
  const { data, isLoading, error, mutate } = useSWR<PluginInfo[]>("/api/plugins", fetcher, { revalidateOnFocus: false });
  const { mutate: globalMutate } = useSWRConfig();
  const refresh = async () => {
    await Promise.all([mutate(), ...RELATED.map((key) => globalMutate(key))]);
  };
  return {
    plugins: data ?? [],
    isLoading,
    error,
    preview: (source: PluginSource) => send<PluginPreview>("/api/plugins", "POST", { source, preview: true }),
    install: async (source: PluginSource, secrets: Record<string, string>) => {
      await send("/api/plugins", "POST", { source, secrets });
      await refresh();
    },
    setEnabled: async (id: string, enabled: boolean) => {
      await send(`/api/plugins/${id}`, "PATCH", { enabled });
      await refresh();
    },
    update: async (id: string) => {
      await send(`/api/plugins/${id}`, "PATCH", { update: true });
      await refresh();
    },
    uninstall: async (id: string) => {
      await send(`/api/plugins/${id}`, "DELETE");
      await refresh();
    },
    browseMarketplace: (url: string) => fetcher<Marketplace>(`/api/plugins/marketplace?url=${encodeURIComponent(url)}`),
  };
}
