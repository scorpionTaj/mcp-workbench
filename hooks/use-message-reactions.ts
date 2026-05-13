"use client";

import { useState, useCallback } from "react";
import type { MessageReaction, MessageAnnotation } from "@/lib/schema";

export function useMessageReactions(messageId: string) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`);

      if (!response.ok) {
        throw new Error("Failed to fetch reactions");
      }

      const data = await response.json();
      setReactions(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch reactions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  const addReaction = useCallback(
    async (type: string, emoji?: string) => {
      try {
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, emoji }),
        });

        if (!response.ok) {
          throw new Error("Failed to add reaction");
        }

        const newReaction = await response.json();
        setReactions((prev) => {
          const existing = prev.find((r) => r.type === type);
          if (existing) {
            return prev.map((r) =>
              r.type === type ? { ...r, count: r.count + 1 } : r,
            );
          }
          return [...prev, newReaction];
        });

        return newReaction;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add reaction";
        setError(message);
        throw err;
      }
    },
    [messageId],
  );

  const removeReaction = useCallback(
    async (type: string) => {
      try {
        const response = await fetch(
          `/api/messages/${messageId}/reactions?type=${type}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to remove reaction");
        }

        setReactions((prev) =>
          prev
            .map((r) =>
              r.type === type && r.count > 1 ? { ...r, count: r.count - 1 } : r,
            )
            .filter((r) => r.count > 0),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove reaction";
        setError(message);
        throw err;
      }
    },
    [messageId],
  );

  return {
    reactions,
    isLoading,
    error,
    fetchReactions,
    addReaction,
    removeReaction,
  };
}

export function useMessageAnnotations(messageId: string) {
  const [annotations, setAnnotations] = useState<MessageAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnotations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${messageId}/annotations`);

      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }

      const data = await response.json();
      setAnnotations(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch annotations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  const createAnnotation = useCallback(
    async (
      type: string,
      content?: string,
      options?: {
        color?: string;
        position?: number;
        length?: number;
      },
    ) => {
      try {
        const response = await fetch(`/api/messages/${messageId}/annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, content, ...options }),
        });

        if (!response.ok) {
          throw new Error("Failed to create annotation");
        }

        const newAnnotation = await response.json();
        setAnnotations((prev) => [...prev, newAnnotation]);
        return newAnnotation;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create annotation";
        setError(message);
        throw err;
      }
    },
    [messageId],
  );

  const updateAnnotation = useCallback(
    async (
      annotationId: string,
      updates: {
        content?: string;
        color?: string;
        type?: string;
      },
    ) => {
      try {
        const response = await fetch(
          `/api/messages/annotations/${annotationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update annotation");
        }

        const updated = await response.json();
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? updated : a)),
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update annotation";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    try {
      const response = await fetch(
        `/api/messages/annotations/${annotationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete annotation");
      }

      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete annotation";
      setError(message);
      throw err;
    }
  }, []);

  return {
    annotations,
    isLoading,
    error,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
