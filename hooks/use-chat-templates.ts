"use client";

import { useState, useCallback } from "react";
import type { ChatTemplate } from "@/lib/schema";

export function useChatTemplates() {
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates with filters
  const fetchTemplates = useCallback(
    async (filters?: {
      category?: string;
      search?: string;
      isPublic?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters?.category) params.append("category", filters.category);
        if (filters?.search) params.append("search", filters.search);
        if (filters?.isPublic !== undefined)
          params.append("public", filters.isPublic.toString());

        const response = await fetch(
          `/api/chat/templates?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }

        const data = await response.json();
        setTemplates(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch templates";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Fetch popular templates
  const fetchPopularTemplates = useCallback(async (limit: number = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chat/templates?popular=true&limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch popular templates");
      }

      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch templates";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get template by ID
  const getTemplate = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/chat/templates/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch template");
      }

      return await response.json();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch template";
      setError(message);
      return null;
    }
  }, []);

  // Create template
  const createTemplate = useCallback(async (templateData: any) => {
    try {
      const response = await fetch("/api/chat/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      const newTemplate = await response.json();
      setTemplates((prev) => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create template";
      setError(message);
      throw err;
    }
  }, []);

  // Update template
  const updateTemplate = useCallback(async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/chat/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      const updated = await response.json();
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update template";
      setError(message);
      throw err;
    }
  }, []);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/chat/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete template";
      setError(message);
      throw err;
    }
  }, []);

  // Use template (increment usage count)
  const useTemplate = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/chat/templates/${id}?action=use`, {
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error("Failed to use template");
      }

      return await response.json();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to use template";
      setError(message);
      throw err;
    }
  }, []);

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    fetchPopularTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
  };
}
