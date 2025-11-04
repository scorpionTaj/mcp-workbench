"use client"

import useSWR from "swr"
import type { LLMProviderStatus } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useProviders() {
  const { data, error, isLoading, mutate } = useSWR<LLMProviderStatus[]>("/api/providers", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds to reduce frequency
    revalidateOnFocus: false, // Disable revalidation on focus to reduce API calls
    revalidateOnReconnect: true, // Only revalidate on reconnect
    dedupingInterval: 10000, // 10 seconds deduping interval to prevent duplicate requests
    errorRetryCount: 3, // Limit retries to prevent infinite loops
    errorRetryInterval: 5000, // Retry after 5 seconds if there's an error
  })

  return {
    providers: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  }
}

export function useProvider(provider: string) {
  const { data, error, isLoading, mutate } = useSWR<LLMProviderStatus>(`/api/providers/${provider}`, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: false, // Disable revalidation on focus
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  })

  return {
    provider: data,
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
