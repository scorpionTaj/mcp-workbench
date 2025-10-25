"use client";

import useSWR from "swr";
import type { MCPServer } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useInstalledServers() {
  const { data, error, isLoading, mutate } = useSWR<MCPServer[]>(
    "/api/tools",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  const toggleServer = async (serverId: string) => {
    try {
      const response = await fetch(`/api/tools/${serverId}/toggle`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle server");
      }

      await mutate();
    } catch (error) {
      console.error("MCP Workbench Error toggling server:", error);
      alert("Failed to toggle server. Please try again.");
    }
  };

  const uninstallServer = async (serverId: string) => {
    if (!confirm("Are you sure you want to uninstall this server?")) {
      return;
    }

    try {
      const response = await fetch(`/api/registry/${serverId}/uninstall`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to uninstall server");
      }

      await mutate();
    } catch (error) {
      console.error("MCP Workbench Error uninstalling server:", error);
      alert("Failed to uninstall server. Please try again.");
    }
  };

  return {
    servers: data || [],
    isLoading,
    isError: error,
    toggleServer,
    uninstallServer,
    refresh: mutate,
  };
}
