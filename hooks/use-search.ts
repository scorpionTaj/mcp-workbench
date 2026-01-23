"use client";

import { useState, useCallback, useEffect } from "react";
import type { SearchFilters } from "@/lib/search-service";

export interface SearchResult {
  message: {
    id: string;
    chatId: string;
    content: string;
    role: string;
    createdAt: Date;
    provider?: string;
    modelId?: string;
    tokensIn?: number;
    tokensOut?: number;
  };
  chat: {
    id: string;
    title?: string;
  };
  relevanceScore: number;
  matchedFields: string[];
  snippet: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: string;
  resultsCount: number;
  createdAt: Date;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform search
  const search = useCallback(
    async (query: string, filters?: SearchFilters, selectedResult?: string) => {
      if (!query || query.trim().length === 0) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query,
        });

        if (filters?.chatId) params.append("chatId", filters.chatId);
        if (filters?.messageRole) params.append("role", filters.messageRole);
        if (filters?.provider) params.append("provider", filters.provider);
        if (filters?.startDate)
          params.append("startDate", filters.startDate.toISOString());
        if (filters?.endDate)
          params.append("endDate", filters.endDate.toISOString());
        if (filters?.minTokens)
          params.append("minTokens", filters.minTokens.toString());
        if (filters?.maxTokens)
          params.append("maxTokens", filters.maxTokens.toString());

        const response = await fetch(`/api/search?${params}`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: SearchResult[] = await response.json();
        setResults(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get search history
  const fetchHistory = useCallback(async (limit = 10) => {
    try {
      const response = await fetch(`/api/search?action=history&limit=${limit}`);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data: SearchHistoryItem[] = await response.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch search history:", err);
    }
  }, []);

  // Get search suggestions
  const fetchSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length === 0) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/search?action=suggestions&q=${prefix}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data: string[] = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  }, []);

  // Get popular search terms
  const fetchPopularTerms = useCallback(async (limit = 5) => {
    try {
      const response = await fetch(`/api/search?action=popular&limit=${limit}`);

      if (!response.ok) {
        throw new Error("Failed to fetch popular terms");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Failed to fetch popular terms:", err);
      return [];
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    results,
    history,
    suggestions,
    isLoading,
    error,
    search,
    fetchHistory,
    fetchSuggestions,
    fetchPopularTerms,
  };
}
