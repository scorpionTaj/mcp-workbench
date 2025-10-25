"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import type { RegistryServer } from "@/lib/github-registry";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  });

export function useRegistryServers() {
  const { data, error, isLoading, mutate } = useSWR<
    RegistryServer[] | { error: string; servers: RegistryServer[] }
  >("/api/registry", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // Cache for 1 minute
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  const [isInstalling, setIsInstalling] = useState(false);

  const servers = Array.isArray(data) ? data : data?.servers || [];
  const errorMessage = !Array.isArray(data) && data?.error ? data.error : null;

  const installServer = useCallback(
    async (serverId: string) => {
      setIsInstalling(true);
      try {
        const response = await fetch(`/api/registry/${serverId}/install`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to install server");
        }

        await mutate();
      } catch (error) {
        console.error("MCP Workbench Error installing server:", error);
        throw error;
      } finally {
        setIsInstalling(false);
      }
    },
    [mutate]
  );

  const uninstallServer = useCallback(
    async (serverId: string) => {
      setIsInstalling(true);
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
        throw error;
      } finally {
        setIsInstalling(false);
      }
    },
    [mutate]
  );

  const refreshRegistry = useCallback(async () => {
    try {
      await fetch("/api/registry/refresh", { method: "POST" });
      await mutate();
    } catch (error) {
      console.error("MCP Workbench Error refreshing registry:", error);
      throw error;
    }
  }, [mutate]);

  return {
    servers,
    isLoading,
    isError: error || errorMessage,
    errorMessage: errorMessage || (error ? "Failed to load registry" : null),
    isInstalling,
    installServer,
    uninstallServer,
    refresh: mutate,
    refreshRegistry,
  };
}
