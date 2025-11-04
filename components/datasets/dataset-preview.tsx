"use client";

import { memo } from "react";
import { useDatasetPreview } from "@/hooks/use-dataset-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DatasetPreviewProps {
  datasetId: string;
}

export const DatasetPreview = memo(function DatasetPreview({
  datasetId,
}: DatasetPreviewProps) {
  const { preview, isLoading } = useDatasetPreview(datasetId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="text-muted-foreground text-center py-8">
        Failed to load preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary">{preview.rows} rows</Badge>
        <Badge variant="secondary">{preview.columns.length} columns</Badge>
        <Badge variant="secondary">{(preview.size / 1024).toFixed(2)} KB</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((column) => (
                  <TableHead
                    key={column}
                    className="font-semibold whitespace-nowrap"
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.data.map((row, idx) => (
                <TableRow key={idx}>
                  {preview.columns.map((column) => (
                    <TableCell key={column} className="whitespace-nowrap">
                      {String(row[column] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing first {preview.data.length} rows
      </p>
    </div>
  );
});
