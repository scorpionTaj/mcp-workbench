"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Eye, Library, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatasetPreview } from "@/components/datasets/dataset-preview";
import { DatasetUpload } from "@/components/datasets/dataset-upload";
import { useDatasets } from "@/hooks/use-datasets";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import type { Dataset } from "@/lib/types";

const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(0.1, n / 1024).toFixed(1)} KB`;

function AddToKnowledge({ dataset, onClose }: { dataset: Dataset; onClose: () => void }) {
  const { knowledgeBases } = useKnowledgeBases();
  const { addToKnowledge } = useDatasets();
  const [kbId, setKbId] = useState("");
  const [maxRows, setMaxRows] = useState(5000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!knowledgeBases.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a knowledge base first on the{" "}
        <Link href="/knowledge" className="text-accent underline-offset-4 hover:underline">
          Knowledge
        </Link>{" "}
        page.
      </p>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);
        try {
          const r = await addToKnowledge(dataset.id, kbId, maxRows);
          setMessage({
            ok: true,
            text: `Added ${r.rows.toLocaleString()}${r.rows < r.totalRows ? ` of ${r.totalRows.toLocaleString()}` : ""} rows. Embedding continues in the background.`,
          });
        } catch (err) {
          setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted-foreground">
        Each row becomes a text record (&ldquo;column: value; …&rdquo;) so chats and agents using the knowledge base can
        find rows with search_knowledge. Good for lookups; for aggregates use the notebook.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="ds-kb">Knowledge base</Label>
          <Select value={kbId} onValueChange={setKbId}>
            <SelectTrigger id="ds-kb">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {knowledgeBases.map((kb) => (
                <SelectItem key={kb.id} value={kb.id}>
                  {kb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-rows">Max rows</Label>
          <Input id="ds-rows" type="number" min={1} max={20000} value={maxRows} onChange={(e) => setMaxRows(Number(e.target.value))} />
        </div>
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!kbId || busy}>
          {busy ? "Adding…" : "Add rows"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </form>
  );
}

export default function DatasetsPage() {
  const { datasets, isLoading, deleteDataset } = useDatasets();
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<Dataset | null>(null);
  const [indexing, setIndexing] = useState<Dataset | null>(null);
  const shown = datasets.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">Upload CSV, TSV or Parquet files, explore their columns, and add them to a knowledge base.</p>
        </div>
        <div className="flex gap-2">
          {datasets.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Filter datasets" aria-label="Filter datasets" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 pl-9" />
            </div>
          )}
          <Button onClick={() => setUploading(true)}>
            <Upload className="size-4" /> Upload dataset
          </Button>
        </div>
      </div>

      <Dialog open={uploading} onOpenChange={setUploading}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload a dataset</DialogTitle>
            <DialogDescription>The file stays private to your account.</DialogDescription>
          </DialogHeader>
          <DatasetUpload onDone={() => setUploading(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="break-all">{previewing?.name}</DialogTitle>
            <DialogDescription>Sample rows and per-column statistics</DialogDescription>
          </DialogHeader>
          {previewing && <DatasetPreview datasetId={previewing.id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={indexing !== null} onOpenChange={(open) => !open && setIndexing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to a knowledge base</DialogTitle>
            <DialogDescription className="break-all">{indexing?.name}</DialogDescription>
          </DialogHeader>
          {indexing && <AddToKnowledge dataset={indexing} onClose={() => setIndexing(null)} />}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Database className="size-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">{datasets.length ? "No datasets match" : "No datasets yet"}</p>
            {!datasets.length && <p className="text-sm text-muted-foreground">Upload a CSV, TSV or Parquet file to explore it.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="break-all text-base">{d.name}</CardTitle>
                <CardDescription>
                  {formatBytes(d.size)}
                  {d.rows !== undefined && ` · ${d.rows.toLocaleString()} rows`}
                  {d.columns !== undefined && ` · ${d.columns} columns`} · {new Date(d.uploadedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="uppercase">
                    {d.type}
                  </Badge>
                  {d.indexed && (
                    <Badge variant="outline">
                      <Library /> in a knowledge base
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreviewing(d)}>
                    <Eye className="size-3.5" /> Explore
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIndexing(d)}>
                    <Library className="size-3.5" /> Add to knowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => confirm(`Delete ${d.name}?`) && deleteDataset(d.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
