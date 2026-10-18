import { useMemo } from "react";
import useSWR from "swr";
import { type LLMProviderStatus } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";

const EMPTY: LLMProviderStatus[] = [];

// One shared, deduplicated request no matter how many components use this hook.
export function useProviders() {
  const { data, isLoading, mutate } = useSWR<LLMProviderStatus[]>("/api/providers/status", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  const toggleProvider = async (provider: string, enabled: boolean) => {
    const response = await fetch("/api/providers/toggle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, enabled }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update provider");
    }
    await mutate();
  };

  // Model pickers only see enabled providers; /providers lists every row (allProviders).
  const providers = useMemo(() => (data ?? []).filter((p) => p.enabled !== false), [data]);

  return {
    providers,
    allProviders: data ?? EMPTY,
    isLoading,
    refresh: () => mutate(),
    toggleProvider,
  };
}
