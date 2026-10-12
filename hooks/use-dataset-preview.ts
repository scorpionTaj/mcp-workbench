"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ColumnProfile, Row } from "@/lib/tabular";

export interface DatasetPreviewData {
  columns: string[];
  profile: ColumnProfile[];
  profiledRows: number;
  data: Row[];
  rows: number;
  size: number;
}

export function useDatasetPreview(datasetId: string) {
  const { data, error, isLoading } = useSWR<DatasetPreviewData>(datasetId ? `/api/datasets/${datasetId}/preview` : null, fetcher, {
    revalidateOnFocus: false,
  });
  return { preview: data, isLoading, error };
}
