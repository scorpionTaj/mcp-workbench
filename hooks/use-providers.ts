"use client"

import useSWR from "swr"
import type { LLMProviderStatus } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useProviders() {
  const { data, error, isLoading, mutate } = useSWR<LLMProviderStatus[]>("/api/providers", fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
    revalidateOnFocus: true,
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
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })

  return {
    provider: data,
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
