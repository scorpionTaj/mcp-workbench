"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatasetPreview } from "@/hooks/use-dataset-preview";
import type { ColumnProfile } from "@/lib/tabular";

const TYPE_COLOR: Record<ColumnProfile["type"], string> = {
  number: "text-accent",
  boolean: "text-warning",
  date: "text-success",
  text: "text-muted-foreground",
  empty: "text-muted-foreground",
};

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 3 }));

function ColumnCard({ col, rows }: { col: ColumnProfile; rows: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-sm" title={col.name}>
          {col.name}
        </span>
        <span className={`font-mono ${TYPE_COLOR[col.type]}`}>{col.type}</span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {col.distinct.toLocaleString()} distinct
        {col.nulls > 0 && ` · ${((col.nulls / Math.max(rows, 1)) * 100).toFixed(1)}% empty`}
      </p>
      {col.type === "number" && (
        <p className="mt-1 font-mono">
          {fmt(col.min!)} … {fmt(col.max!)} · mean {fmt(col.mean!)}
        </p>
      )}
      {col.top && col.top.length > 0 && (
        <p className="mt-1 truncate" title={col.top.map((t) => `${t.value} (${t.count})`).join(", ")}>
          {col.top.map((t) => `${t.value} (${t.count})`).join(", ")}
        </p>
      )}
    </div>
  );
}

export function DatasetPreview({ datasetId }: { datasetId: string }) {
  const { preview, isLoading, error } = useDatasetPreview(datasetId);
  const [tab, setTab] = useState<"rows" | "columns">("rows");

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!preview) return <p className="py-8 text-center text-danger">{error?.message ?? "Failed to load preview"}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{preview.rows.toLocaleString()} rows</Badge>
        <Badge variant="secondary">{preview.columns.length} columns</Badge>
        <Badge variant="secondary">{preview.size >= 1048576 ? `${(preview.size / 1048576).toFixed(1)} MB` : `${(preview.size / 1024).toFixed(1)} KB`}</Badge>
        <div role="tablist" aria-label="Preview view" className="ml-auto flex gap-1">
          {(["rows", "columns"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${tab === t ? "bg-default text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "columns" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {preview.profile.map((col) => (
              <ColumnCard key={col.name} col={col} rows={preview.profiledRows} />
            ))}
          </div>
          {preview.profiledRows < preview.rows && (
            <p className="text-xs text-muted-foreground">Stats from the first {preview.profiledRows.toLocaleString()} rows.</p>
          )}
        </>
      ) : (
        <>
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.columns.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap font-semibold">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.data.map((row, i) => (
                  <TableRow key={i}>
                    {preview.columns.map((c) => (
                      <TableCell key={c} className={`max-w-xs truncate whitespace-nowrap ${typeof row[c] === "number" ? "text-right font-mono" : ""}`}>
                        {row[c] === null ? <span className="text-muted-foreground">∅</span> : String(row[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Showing the first {preview.data.length} rows.</p>
        </>
      )}
    </div>
  );
}
