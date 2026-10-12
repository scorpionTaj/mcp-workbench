"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatasets } from "@/hooks/use-datasets";
import { cn } from "@/lib/utils";

export function DatasetUpload({ onDone }: { onDone?: () => void }) {
  const { upload } = useDatasets();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    if (accepted[0]) setFile(accepted[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/tab-separated-values": [".tsv"],
      "application/vnd.apache.parquet": [".parquet"],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          isDragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
        )}
      >
        <input {...getInputProps()} aria-label="Dataset file" />
        <Upload className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{isDragActive ? "Drop the file here" : "Drag a file here, or click to choose one"}</p>
        <p className="mt-1 text-xs text-muted-foreground">CSV, TSV or Parquet, up to 50 MB</p>
      </div>

      {file && (
        <div className="flex items-center gap-3 rounded-lg bg-default p-3">
          <FileText className="size-6 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setFile(null)}>
            <X className="size-4" />
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        className="w-full"
        disabled={!file || busy}
        onClick={async () => {
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            await upload(file);
            setFile(null);
            onDone?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Uploading…" : "Upload dataset"}
      </Button>
    </div>
  );
}
