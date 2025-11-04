"use client";

import useSWR from "swr";
import type { Dataset } from "@/lib/types";
import logger from "@/lib/logger";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDatasets() {
  const { data, error, isLoading, mutate } = useSWR<Dataset[]>(
    "/api/datasets",
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  const deleteDataset = async (datasetId: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) {
      return;
    }

    try {
      const response = await fetch(`/api/datasets/${datasetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete dataset");
      }

      await mutate();
    } catch (error) {
      logger.error({ err: error }, "MCP Workbench Error deleting dataset");
      alert("Failed to delete dataset. Please try again.");
    }
  };

  const indexDataset = async (datasetId: string) => {
    try {
      const response = await fetch(`/api/datasets/${datasetId}/index`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to index dataset");
      }

      await mutate();
      alert("Dataset indexed successfully!");
    } catch (error) {
      logger.error({ err: error }, "MCP Workbench Error indexing dataset");
      alert("Failed to index dataset. Please try again.");
    }
  };

  return {
    datasets: data || [],
    isLoading,
    isError: error,
    deleteDataset,
    indexDataset,
    refresh: mutate,
  };
}
