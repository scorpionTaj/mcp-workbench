"use client"

import useSWR from "swr"

interface DatasetPreviewData {
  columns: string[]
  data: Record<string, any>[]
  rows: number
  size: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useDatasetPreview(datasetId: string) {
  const { data, error, isLoading } = useSWR<DatasetPreviewData>(
    datasetId ? `/api/datasets/${datasetId}/preview` : null,
    fetcher,
  )

  return {
    preview: data,
    isLoading,
    isError: error,
  }
}
