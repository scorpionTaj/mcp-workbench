import { useState, useEffect } from "react";
import { type LLMProviderStatus } from "@/lib/types";

export function useProviders() {
  const [providers, setProviders] = useState<LLMProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/providers/status");
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      } else {
        throw new Error("Failed to fetch providers");
      }
    } catch (error) {
      console.error("MCP Workbench Error fetching providers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const toggleProvider = async (provider: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/providers/toggle", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider, enabled }),
      });

      if (response.ok) {
        // Refresh the provider list after toggle
        await fetchProviders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update provider");
      }
    } catch (error) {
      console.error("MCP Workbench Error toggling provider:", error);
      throw error;
    }
  };

  return {
    providers,
    isLoading,
    refresh: fetchProviders,
    toggleProvider,
  };
}